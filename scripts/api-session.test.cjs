const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadApi(fetch, env = {}) {
  const storage = new Map();
  const context = {
    exports: {}, process: { env }, window: {}, Headers, URLSearchParams, AbortController, setTimeout, clearTimeout,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    fetch,
  };
  const source = fs.readFileSync(require.resolve('../src/lib/api.ts'), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, context);
  const api = context.exports;
  api.saveSession({ accessToken: 'expired', refreshToken: 'refresh-old', sessionId: 'session', user: { id: 'admin', role: 'ADMIN' } });
  return { api, storage };
}
const reply = (status, payload) => new Response(JSON.stringify(payload), {
  status, headers: { 'content-type': 'application/json' },
});

test('production defaults to AWS and rejects another configured backend', () => {
  assert.equal(loadApi(() => {}, { NODE_ENV: 'production' }).api.API_BASE_URL, 'https://api.clothify.ng');
  assert.throws(() => loadApi(() => {}, { NODE_ENV: 'production', NEXT_PUBLIC_API_BASE_URL: 'https://wrong.invalid' }), /production admin/);
  assert.equal(loadApi(() => {}, { NODE_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'staging' }).api.API_BASE_URL, 'https://aws-test.clothify.ng');
});

test('concurrent 401s share one refresh and store the wrapped rotated session', async () => {
  let refreshes = 0;
  let retries = 0;
  const { api, storage } = loadApi(async (url, options) => {
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise((resolve) => setImmediate(resolve));
      return reply(200, { success: true, data: { accessToken: 'fresh', refreshToken: 'rotated', sessionId: 'session' } });
    }
    if (options.headers.get('Authorization') === 'Bearer fresh') {
      retries++;
      return reply(200, { success: true, data: { ready: true } });
    }
    return reply(401, { message: 'Expired' });
  });
  const results = await Promise.all([api.apiFetch('/admin/me'), api.apiFetch('/admin/roles')]);
  assert.ok(results.every((result) => result.ready));
  assert.equal(refreshes, 1);
  assert.equal(retries, 2);
  assert.equal(storage.get('clothify_admin_refresh_token'), 'rotated');
});

test('explicit revoked refresh clears session; ambiguous refresh and ordinary 403 preserve it', async () => {
  const failed = loadApi(async (url) => reply(401, url.endsWith('/auth/refresh') ? { code: 'SESSION_REVOKED' } : { message: 'Expired' }));
  await assert.rejects(failed.api.apiFetch('/admin/me'), { status: 401 });
  assert.equal(failed.storage.size, 0);
  const ambiguous = loadApi(async (url) => reply(url.endsWith('/auth/refresh') ? 503 : 401, { message: '<html>internal</html>' }));
  await assert.rejects(ambiguous.api.apiFetch('/admin/me'), { code: 'SESSION_REFRESH_UNAVAILABLE' });
  assert.equal(ambiguous.storage.get('clothify_admin_access_token'), 'expired');
  const denied = loadApi(async () => reply(403, { message: 'Forbidden' }));
  await assert.rejects(denied.api.apiFetch('/admin/finance'), { status: 403 });
  assert.equal(denied.storage.get('clothify_admin_access_token'), 'expired');
});

test('raw server errors are never shown and failed envelopes are rejected', async () => {
  const server = loadApi(async () => reply(500, { message: '<html>secret</html>' })).api;
  await assert.rejects(server.apiFetch('/admin/finance'), (error) => !error.message.includes('secret'));
  const malformed = loadApi(async () => reply(200, { success: false, message: 'provider secret' })).api;
  await assert.rejects(malformed.apiFetch('/admin/finance'), { code: 'UNEXPECTED_RESPONSE' });
});

test('caller cancellation stays distinct from timeout and keeps session', async () => {
  const controller = new AbortController();
  controller.abort();
  const { api, storage } = loadApi(async (_url, options) => {
    if (options.signal.aborted) throw new Error('cancelled');
    return reply(200, { success: true, data: {} });
  });
  await assert.rejects(api.apiFetch('/admin/finance', { signal: controller.signal }), { code: 'REQUEST_CANCELLED' });
  assert.equal(storage.get('clothify_admin_access_token'), 'expired');
});

test('a mutation is not replayed after refresh', async () => {
  let actions = 0;
  const { api, storage } = loadApi(async (url) => {
    if (url.endsWith('/auth/refresh')) return reply(200, { success: true, data: { accessToken: 'fresh', refreshToken: 'rotated', sessionId: 'session' } });
    actions++;
    return reply(401, { code: 'SESSION_EXPIRED' });
  });
  await assert.rejects(api.apiFetch('/admin/withdrawals/id/approve', { method: 'PATCH' }), { code: 'AUTH_REFRESHED_ACTION_REVIEW' });
  assert.equal(actions, 1);
  assert.equal(storage.get('clothify_admin_access_token'), 'fresh');
});

test('204 is valid while malformed 200 data is not', async () => {
  const empty = loadApi(async () => new Response(null, { status: 204 })).api;
  assert.equal(await empty.apiFetch('/admin/example', { method: 'DELETE' }), undefined);
  const malformed = loadApi(async () => new Response('<html>secret</html>', { status: 200, headers: { 'content-type': 'text/html' } })).api;
  await assert.rejects(malformed.apiFetch('/admin/example'), { code: 'UNEXPECTED_RESPONSE' });
});
