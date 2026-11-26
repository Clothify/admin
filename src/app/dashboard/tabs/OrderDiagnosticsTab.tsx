"use client";

import * as React from "react";
import { formatDate, formatTime, toUserError } from "@/lib/api";
import {
  diagnosticFindingLabel,
  fetchOrderDiagnostics,
  nextDiagnosticsCursor,
  type OrderDiagnosticKind,
  type OrderDiagnosticPage,
} from "@/lib/order-diagnostics";

const kindLabel: Record<OrderDiagnosticKind, string> = {
  DISCREPANCY: "Discrepancy",
  ADMIN_WAITING: "Admin waiting",
  FINANCE_REVIEW: "Finance review",
};
const kindStyle: Record<OrderDiagnosticKind, string> = {
  DISCREPANCY: "border-red-200 bg-red-50 text-red-800",
  ADMIN_WAITING: "border-amber-200 bg-amber-50 text-amber-800",
  FINANCE_REVIEW: "border-violet-200 bg-violet-50 text-violet-800",
};
const humanize = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

export default function OrderDiagnosticsTab() {
  const [page, setPage] = React.useState<OrderDiagnosticPage | null>(null);
  const [cursor, setCursor] = React.useState<string>();
  const [history, setHistory] = React.useState<(string | undefined)[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const request = React.useRef(0);

  const load = React.useCallback(async (targetCursor?: string) => {
    const current = ++request.current;
    setLoading(true);
    setError("");
    try {
      const result = await fetchOrderDiagnostics(targetCursor);
      if (current !== request.current) return false;
      setPage(result);
      setCursor(targetCursor);
      return true;
    } catch (cause) {
      if (current === request.current) setError(toUserError(cause, "Could not load order diagnostics."));
      return false;
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    return () => { request.current++; };
  }, [load]);

  const nextCursor = page ? nextDiagnosticsCursor(page, cursor) : null;
  async function next() {
    if (!nextCursor || loading) return;
    if (await load(nextCursor)) setHistory((previous) => [...previous, cursor]);
  }
  async function previous() {
    if (!history.length || loading) return;
    const target = history[history.length - 1];
    if (await load(target)) setHistory((previous) => previous.slice(0, -1));
  }

  return <div className="mx-auto max-w-5xl space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Order diagnostics</h1><p className="mt-1 text-sm text-slate-500">Read-only signals for orders that need operational or finance review.</p></div>
      <button type="button" onClick={() => void load(cursor)} disabled={loading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50">Refresh</button>
    </div>

    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}{page && " Showing the last loaded result."}</p>}
    {page && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"><span>{page.items.length} flagged · {page.scanned} scanned on this page</span><span>Generated {formatDate(page.generatedAt)} {formatTime(page.generatedAt)}</span><span>{page.graceMinutes}-minute grace window</span></div>}

    {loading && !page ? <p className="text-sm text-slate-500">Loading diagnostics…</p> : page && page.items.length === 0 ? (
      <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No flagged orders in this scan window.{nextCursor ? " Continue to the next page to scan more." : ""}</p>
    ) : page?.items.map((item) => <article key={item.orderId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="font-semibold text-slate-950">Order {item.orderNumber}</h2><p className="mt-1 text-xs text-slate-500">{humanize(item.status)} · Updated {formatDate(item.updatedAt)} {formatTime(item.updatedAt)}</p></div>
        <span className="text-xs text-slate-400">Created {formatDate(item.createdAt)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{item.findings.map((finding) => <span key={`${finding.kind}-${finding.code}`} className={`inline-flex flex-wrap items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${kindStyle[finding.kind] || "border-slate-200 bg-slate-50 text-slate-700"}`}><b className="font-semibold">{kindLabel[finding.kind] || "Review"}</b><span aria-hidden="true">·</span>{diagnosticFindingLabel(finding.code)}</span>)}</div>
    </article>)}

    {page && <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm"><span className="text-slate-500">Scan page {history.length + 1}</span><div className="flex gap-2"><button type="button" onClick={() => void previous()} disabled={loading || history.length === 0} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 disabled:opacity-40">Previous</button><button type="button" onClick={() => void next()} disabled={loading || !nextCursor} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 disabled:opacity-40">Next</button></div></div>}
  </div>;
}
