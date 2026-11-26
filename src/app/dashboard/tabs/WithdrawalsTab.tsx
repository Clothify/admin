"use client";

import * as React from "react";
import { Check, ChevronLeft, ChevronRight, Eye, RefreshCw, ShieldCheck, X } from "lucide-react";
import { ApiError, formatDate, formatNaira, formatTime } from "@/lib/api";
import CopyableCell from "@/components/dashboard/tables/CopyableCell";
import { TableLoadingState } from "@/components/dashboard/ui/LoadingState";
import {
  Withdrawal,
  approveWithdrawal,
  fetchWithdrawal,
  fetchWithdrawals,
  finalizeWithdrawal,
  rejectWithdrawal,
} from "@/lib/finance";

const statusStyles: Record<string, string> = {
  PENDING_OTP: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

const maskAccount = (value?: string) => value ? `•••• ${value.slice(-4)}` : "-";
const ownerName = (row: Withdrawal) => row.merchant?.businessName || [row.rider?.firstName, row.rider?.lastName].filter(Boolean).join(" ") || "Unknown owner";
const ownerType = (row: Withdrawal) => row.merchant ? "Merchant" : "Rider";
const statusLabel = (row: Withdrawal) => {
  if (row.status === "PENDING_OTP") return "Awaiting customer verification";
  if (row.status === "PENDING" && row.pendingReason === "APPROVAL_REQUIRED") return "Approval required";
  if (row.status === "PENDING" && row.pendingReason === "PROVIDER_CONFIRMATION") return "Provider confirmation";
  if (row.status === "PROCESSING" && row.reconciliationRequired) return "Reconciliation required";
  return row.status.replaceAll("_", " ");
};

export default function WithdrawalsTab({ permissions = [] }: { permissions?: string[] }) {
  const granted = React.useMemo(() => new Set(permissions), [permissions]);
  const [items, setItems] = React.useState<Withdrawal[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [status, setStatus] = React.useState("");
  const [owner, setOwner] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Withdrawal | null>(null);
  const [detailFresh, setDetailFresh] = React.useState(false);
  const [action, setAction] = React.useState<"approve" | "reject" | "finalize" | null>(null);
  const [actionValue, setActionValue] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [version, setVersion] = React.useState(0);
  const submittingRef = React.useRef(false);
  const detailSequence = React.useRef(0);

  const closeDetail = () => {
    detailSequence.current += 1;
    setSelected(null);
    setDetailFresh(false);
    setAction(null);
    setActionValue("");
  };

  const openDetail = async (row: Withdrawal) => {
    const sequence = ++detailSequence.current;
    setAction(null);
    setActionValue("");
    setSelected(row);
    setDetailFresh(false);
    try { const current = await fetchWithdrawal(row.id); if (sequence === detailSequence.current) { setSelected(current); setDetailFresh(true); setError(null); } }
    catch (err) { if (sequence === detailSequence.current) setError(err instanceof ApiError ? err.message : "Could not refresh withdrawal details. Try again."); }
  };

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchWithdrawals({ page, limit: 20, status: status || undefined, owner: owner || undefined })
      .then((res) => {
        if (!alive) return;
        setItems(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      })
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "Unable to load withdrawals. Try again."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [page, status, owner, version]);

  const runAction = async () => {
    if (!selected || !action || !detailFresh || submittingRef.current) return;
    if (action === "reject" && !actionValue.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    if (action === "finalize" && !actionValue.trim()) {
      setError("The Paystack transfer OTP is required.");
      return;
    }
    submittingRef.current = true;
    const sequence = detailSequence.current;
    setSubmitting(true);
    setError(null);
    try {
      const current = await fetchWithdrawal(selected.id);
      if (sequence === detailSequence.current) setSelected(current);
      if (current.status !== "PENDING" || (action === "approve" && current.pendingReason === "PROVIDER_CONFIRMATION") || (action === "finalize" && current.pendingReason === "APPROVAL_REQUIRED")) {
        throw new ApiError("This withdrawal has changed. Review its latest status before acting.", 409);
      }
      if (action === "approve") await approveWithdrawal(selected.id);
      if (action === "reject") await rejectWithdrawal(selected.id, actionValue.trim());
      if (action === "finalize") await finalizeWithdrawal(selected.id, actionValue.trim());
      setAction(null);
      setActionValue("");
      setVersion((v) => v + 1);
      try { const latest = await fetchWithdrawal(selected.id); if (sequence === detailSequence.current) { setSelected(latest); setDetailFresh(true); } }
      catch { if (sequence === detailSequence.current) { setDetailFresh(false); setError("Action submitted. Refresh the withdrawal to confirm its latest status."); } }
    } catch (err: unknown) {
      setDetailFresh(false);
      setError(err instanceof ApiError ? (err.outcomeUnknown ? "Action status is uncertain. Refresh this withdrawal before trying again." : err.message) : "The withdrawal action could not be confirmed. Refresh before trying again.");
      setVersion((v) => v + 1);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Finance operations</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Withdrawals</h1><p className="mt-1 text-sm text-slate-500">Review merchant and rider payouts with a complete transfer trail.</p></div>
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
          <select aria-label="Filter by owner type" value={owner} onChange={(e) => { setOwner(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All owners</option><option value="MERCHANT">Merchants</option><option value="RIDER">Riders</option></select>
          <select aria-label="Filter by withdrawal status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All statuses</option>{Object.keys(statusStyles).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
          <button onClick={() => setVersion((v) => v + 1)} className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200" aria-label="Refresh withdrawals"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}{items.length > 0 ? " Showing last loaded records until refreshed." : ""}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Payout queue</h2><p className="text-xs text-slate-500">{total.toLocaleString()} withdrawal records</p></div><ShieldCheck className="h-5 w-5 text-blue-700" /></div>
        <div className="overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Withdrawals table, horizontally scrollable">
          <table className="w-full min-w-[920px] table-fixed text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Owner</th><th className="px-5 py-3 font-medium">Destination</th><th className="px-5 py-3 font-medium">Amount</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Requested</th><th className="px-5 py-3 text-right font-medium">Review</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="p-0"><TableLoadingState rows={6} columns={6} label="Loading withdrawals" /></td></tr> : error && items.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Withdrawal data is unavailable. Use Refresh to try again.</td></tr> : items.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No withdrawals match these filters.</td></tr> : items.map((row) => <tr key={row.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><CopyableCell value={ownerName(row)} label="owner name" className="font-medium text-slate-900"/><p className="text-xs text-slate-500">{ownerType(row)}</p></td><td className="px-5 py-4"><CopyableCell value={`${row.bankAccount.bankName} · ${maskAccount(row.bankAccount.accountNumber)} · ${row.bankAccount.accountName}`} label="withdrawal destination" lines={2}/></td><td className="px-5 py-4 font-semibold text-slate-950"><CopyableCell value={formatNaira(row.amount)} label="withdrawal amount"/></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[row.status] || "bg-slate-100"}`}>{statusLabel(row)}</span></td><td className="px-5 py-4 text-slate-600"><CopyableCell value={`${formatDate(row.createdAt)} ${formatTime(row.createdAt)}`} label="request date"/></td><td className="px-5 py-4 text-right"><button onClick={() => void openDetail(row)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"><Eye className="h-3.5 w-3.5"/>Details</button></td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm"><span className="text-slate-500">Page {page} of {totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((v) => v - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4"/></button><button disabled={page >= totalPages} onClick={() => setPage((v) => v + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4"/></button></div></div>
      </section>

      {selected && <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/35" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDetail(); }}><aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Withdrawal detail</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{ownerName(selected)}</h2><p className="mt-1 font-mono text-xs text-slate-400">{selected.id}</p></div><button onClick={closeDetail} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close withdrawal details"><X className="h-5 w-5"/></button></div><button onClick={() => void openDetail(selected)} className="mt-4 text-sm font-semibold text-blue-700">Refresh detail</button><div className="mt-6 rounded-2xl bg-[#172554] p-5 text-white"><p className="text-xs uppercase tracking-wider text-blue-200">Requested amount</p><p className="mt-2 text-3xl font-semibold">{formatNaira(selected.amount)}</p><span className={`mt-4 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[selected.status]}`}>{statusLabel(selected)}</span></div><dl className="mt-6 space-y-4 text-sm">{[["Owner type", ownerType(selected)],["Bank", selected.bankAccount.bankName],["Account", maskAccount(selected.bankAccount.accountNumber)],["Verified name", selected.bankAccount.accountName],["Reference", selected.reference || "-"],["Transfer reference", selected.transferRef || "-"],["Requested", `${formatDate(selected.createdAt)} ${formatTime(selected.createdAt)}`]].map(([label, value]) => <div key={label} className="flex justify-between gap-6 border-b border-slate-100 pb-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-900">{value}</dd></div>)}</dl>{(selected.failureReason || selected.reviewReason) && <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{"Review the latest payout status before taking another action."}</div>}<div className="mt-8 grid gap-2 sm:grid-cols-2">{detailFresh && selected.status === "PENDING" && selected.pendingReason !== "PROVIDER_CONFIRMATION" && !selected.transferCode && granted.has("withdrawals.approve") && <button onClick={() => setAction("approve")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"><Check className="h-4 w-4"/>Approve transfer</button>}{detailFresh && selected.status === "PENDING" && selected.pendingReason !== "PROVIDER_CONFIRMATION" && !selected.transferCode && granted.has("withdrawals.reject") && <button onClick={() => setAction("reject")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"><X className="h-4 w-4"/>Reject</button>}{detailFresh && selected.status === "PENDING" && selected.pendingReason !== "APPROVAL_REQUIRED" && selected.transferCode && granted.has("withdrawals.finalize") && <button onClick={() => setAction("finalize")} className="col-span-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800">Finalize Paystack OTP</button>}</div></aside></div>}

      {selected && action && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 px-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-semibold capitalize text-slate-950">{action} withdrawal</h2><p className="mt-2 text-sm text-slate-500">Confirm {formatNaira(selected.amount)} for {ownerName(selected)}. This action will be recorded in the audit log.</p>{action !== "approve" && (action === "reject" ? <textarea autoFocus value={actionValue} onChange={(e) => setActionValue(e.target.value)} placeholder="Required rejection reason" className="mt-4 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"/> : <input autoFocus value={actionValue} onChange={(e) => setActionValue(e.target.value)} placeholder="Paystack transfer OTP" className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>)}<div className="mt-6 flex justify-end gap-2"><button disabled={submitting} onClick={() => { setAction(null); setActionValue(""); }} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={submitting} onClick={() => void runAction()} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${action === "reject" ? "bg-red-600" : "bg-blue-700"}`}>{submitting ? "Working…" : "Confirm"}</button></div></div></div>}
    </div>
  );
}
