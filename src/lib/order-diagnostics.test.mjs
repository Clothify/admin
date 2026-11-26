import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(resolve(root, "src/lib/order-diagnostics.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const calls = [];
const page = { generatedAt: "2026-11-26T00:00:00.000Z", graceMinutes: 5, scanned: 25, hasMore: true, nextCursor: "order-25", items: [] };
const module = { exports: {} };
new Function("module", "exports", "require", compiled)(module, module.exports, () => ({
  apiFetch: async (path, options) => { calls.push({ path, options }); return page; },
}));
const { fetchOrderDiagnostics, nextDiagnosticsCursor, diagnosticFindingLabel } = module.exports;

test("diagnostics use the read-only Admin endpoint with cursor paging", async () => {
  assert.equal(await fetchOrderDiagnostics(), page);
  assert.deepEqual(calls[0], { path: "/admin/order-diagnostics", options: { query: { limit: 25, cursor: undefined } } });
  await fetchOrderDiagnostics("order-25");
  assert.equal(calls[1].options.query.cursor, "order-25");
});

test("an empty scan window can still advance to the next cursor", () => {
  assert.equal(nextDiagnosticsCursor(page), "order-25");
  assert.equal(nextDiagnosticsCursor(page, "order-25"), null);
  assert.equal(nextDiagnosticsCursor({ ...page, hasMore: false }), null);
});

test("diagnostic codes have compact human labels", () => {
  assert.equal(diagnosticFindingLabel("DISPATCH_AWAITING_ADMIN"), "Dispatch needs Admin");
  assert.equal(diagnosticFindingLabel("PAYMENT_LEDGER_REVIEW"), "Payment ledger review");
  assert.equal(diagnosticFindingLabel("UNKNOWN_FUTURE_CODE"), "Unknown Future Code");
});
