"use client";

import * as React from "react";
import { toUserError } from "@/lib/api";
import { fetchPendingMerchantBanks, reviewMerchantBank, type PendingMerchantBank } from "@/lib/bank-reviews";
import { fetchMerchantDocuments, reviewMerchantDocument, type MerchantDocument } from "@/lib/merchants";

const normalizeName = (name: string) => name.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim().replace(/\s+/g, " ");

export default function BankReviewsTab({ permissions = [] }: { permissions?: string[] }) {
  const [items, setItems] = React.useState<PendingMerchantBank[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [cacDocument, setCacDocument] = React.useState<MerchantDocument | null>(null);
  const [registeredName, setRegisteredName] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const canReview = permissions.includes("merchants.review");

  const load = React.useCallback(async () => {
    try { const result = await fetchPendingMerchantBanks(page); setItems(result.items); setTotal(result.total); setError(""); }
    catch (e) { setError(toUserError(e, "Could not load bank reviews.")); }
    finally { setLoading(false); }
  }, [page]);
  React.useEffect(() => { void load(); }, [load]);

  const open = async (bank: PendingMerchantBank) => {
    setSelected(bank.id);
    setCacDocument(null);
    setRegisteredName(bank.cac?.registeredName || "");
    setReason("");
    setError("");
    try {
      const docs = await fetchMerchantDocuments(bank.merchantId);
      setCacDocument(docs.find((doc) => doc.type === "MERCHANT_CAC") || null);
    } catch (e) { setError(toUserError(e, "Could not load the CAC document.")); }
  };
  const saveCac = async (bank: PendingMerchantBank) => {
    if (!cacDocument || !registeredName.trim()) { setError("Open the CAC document and enter its registered name."); return; }
    setBusy(true); setError("");
    try {
      await reviewMerchantDocument(cacDocument.id, "APPROVED", undefined, registeredName.trim());
      setItems((current) => current.map((item) => item.id === bank.id ? { ...item, cac: { id: cacDocument.id, status: "APPROVED", registeredName: registeredName.trim() } } : item));
    } catch (e) { setError(toUserError(e, "Could not save the CAC name.")); }
    finally { setBusy(false); }
  };
  const review = async (bank: PendingMerchantBank, status: "APPROVED" | "REJECTED") => {
    if (status === "REJECTED" && !reason.trim()) { setError("Enter a reason for the merchant."); return; }
    if (status === "APPROVED" && normalizeName(bank.cac?.registeredName || "") !== normalizeName(bank.accountName) && !reason.trim()) { setError("Record why this different account holder is authorized."); return; }
    setBusy(true); setError("");
    try {
      await reviewMerchantBank(bank.id, status, reason.trim() || undefined);
      setSelected(null);
      if (page > 1 && items.length === 1) setPage(page - 1);
      else await load();
    } catch (e) { setError(toUserError(e, "Could not review this bank account.")); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-5">
    <div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Bank reviews</h1><p className="mt-1 text-sm text-slate-500">Check the account holder against the name on the CAC certificate. Existing accounts continue receiving payouts until reviewed.</p></div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
    {loading ? <p className="text-sm text-slate-500">Loading…</p> : items.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No bank accounts awaiting review.</p> : items.map((bank) => <div key={bank.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-semibold text-slate-950">{bank.merchant.businessName}</h2><p className="mt-1 text-sm text-slate-600">{bank.bankName} · ••••{bank.accountNumber.slice(-4)} {bank.reviewStatus === "LEGACY" ? "· Existing account" : "· Awaiting approval"}</p></div>
        <button type="button" onClick={() => void open(bank)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">Review</button>
      </div>
      {selected === bank.id && <div className="mt-5 space-y-4 border-t border-slate-100 pt-5 text-sm">
        <div className="grid gap-4 sm:grid-cols-2"><div><span className="text-slate-500">Bank account holder</span><p className="mt-1 font-medium text-slate-950">{bank.accountName}</p></div><div><span className="text-slate-500">CAC registered name</span><p className="mt-1 font-medium text-slate-950">{bank.cac?.registeredName || "Not recorded"}</p></div></div>
        {cacDocument ? <a href={cacDocument.url} target="_blank" rel="noreferrer" className="inline-block font-medium text-blue-800 underline">Open CAC document</a> : <p className="text-amber-800">CAC document unavailable. Approval is blocked.</p>}
        {canReview && cacDocument && <div className="flex flex-wrap items-end gap-3"><label className="min-w-64 flex-1 text-slate-700">Registered name on CAC<input value={registeredName} onChange={(e) => setRegisteredName(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950" /></label><button type="button" disabled={busy || !registeredName.trim()} onClick={() => void saveCac(bank)} className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-800 disabled:opacity-50">Save CAC name</button></div>}
        {canReview && <div className="flex flex-wrap items-end gap-3"><label className="min-w-64 flex-1 text-slate-700">Review note (required for a different name or rejection)<input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950" /></label><button type="button" disabled={busy || bank.cac?.status !== "APPROVED" || !bank.cac.registeredName} onClick={() => void review(bank, "APPROVED")} className="rounded-lg bg-[#071D59] px-4 py-2 font-medium text-white disabled:opacity-50">Approve account</button><button type="button" disabled={busy} onClick={() => void review(bank, "REJECTED")} className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 disabled:opacity-50">Reject</button></div>}
      </div>}
    </div>)}
    {total > 50 && <div className="flex items-center justify-end gap-3 text-sm text-slate-600"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">Previous</button><span>{page} of {Math.ceil(total / 50)}</span><button type="button" disabled={page * 50 >= total} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">Next</button></div>}
  </div>;
}
