"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";

type MerchantProfileChange = {
  id: string;
  merchantId: string;
  businessName: string | null;
  kind: "PROFILE" | "DOCUMENT";
  field: string;
  before: unknown;
  after: unknown;
  status: "LIVE" | "SUPERSEDED" | "REJECTED";
  rejectionReason?: string | null;
  createdAt: string;
};
type ChangePage = { items: MerchantProfileChange[]; total: number; page: number; limit: number };
const LABELS: Record<string, string> = {
  businessName: "Business name",
  businessEmail: "Business email",
  businessPhone: "Business phone",
  description: "Business description",
  address: "Store address",
  city: "City",
  state: "State",
  latitude: "Latitude",
  longitude: "Longitude",
  disabledServices: "Available services",
  isExclusiveCapable: "Exclusive garment handling",
  MERCHANT_BUSINESS_LOGO: "Business logo",
  MERCHANT_STOREFRONT: "Storefront photo",
  MERCHANT_INTERIOR: "Interior photo",
  MERCHANT_EQUIPMENT: "Equipment photo",
  MERCHANT_FINISHED_LAUNDRY: "Finished laundry photo",
  MERCHANT_CAC: "CAC document",
  MERCHANT_COVER_IMAGE: "Cover photo",
  MERCHANT_STORE_IMAGE: "Store photo",
};

function FileOrValue({ change, value }: { change: MerchantProfileChange; value: unknown }) {
  if (value == null || value === "") return <span className="text-gray-400">Not set</span>;
  if (change.kind === "DOCUMENT" && typeof value === "string") {
    // Signed S3 links often lack an extension in the visible file name.
    const maybePdf = /\.pdf(?:\?|$)/i.test(value) || change.field === "MERCHANT_CAC";
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="inline-block text-[#071D59] hover:underline">
        {maybePdf
          ? <span className="inline-flex rounded-md border border-gray-200 px-3 py-2 text-xs">View document</span>
          : <img src={value} alt={LABELS[change.field] || "Business image"}
              className="h-16 w-24 rounded-lg border border-gray-200 bg-gray-50 object-contain" />}
      </a>
    );
  }
  if (typeof value === "boolean") return <span>{value ? "Enabled" : "Disabled"}</span>;
  if (Array.isArray(value)) return <span>{value.join(", ") || "None"}</span>;
  if (typeof value === "object") return <span>{JSON.stringify(value)}</span>;
  return <span className="break-words">{String(value)}</span>;
}

export default function MerchantProfileUpdatesPanel() {
  const [status, setStatus] = React.useState("LIVE");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [response, setResponse] = React.useState<ChangePage>({ items: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [version, refresh] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    let current = true;
    setLoading(true);
    apiFetch<ChangePage>("/admin/merchant-profile-changes", {
      query: { status: status || undefined, search: search || undefined, page, limit: 20 },
    }).then((result) => {
      if (current) { setResponse(result); setError(""); }
    }).catch((err: unknown) => {
      if (current) setError(err instanceof Error ? err.message : "Unable to load merchant updates.");
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [page, search, status, version]);

  const reject = async (id: string) => {
    if (saving || reason.trim().length < 4) return;
    setSaving(true);
    try {
      await apiFetch("/admin/merchant-profile-changes/" + encodeURIComponent(id) + "/reject", {
        method: "PATCH",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setSelectedId(null);
      setReason("");
      refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to reject this change.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-label="Merchant profile changes">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Merchant profile updates</h2>
          <p className="mt-1 text-sm text-gray-500">Verified merchants publish directly. Changes can be rejected afterward.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input aria-label="Search merchant updates" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search business name" className="h-10 w-44 rounded-lg border border-gray-200 px-3 text-sm" />
          <select aria-label="Filter profile updates" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm">
            <option value="LIVE">Live</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUPERSEDED">Replaced</option>
            <option value="">All</option>
          </select>
          <button type="button" onClick={refresh}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      {error && <div role="alert" className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</div>}
      {loading ? <p className="px-5 py-10 text-sm text-gray-500">Loading updates…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>{["Date", "Merchant", "Changed", "Previous", "Updated", "Status", ""].map(x =>
                <th key={x} className="px-4 py-3 font-semibold">{x}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {response.items.map(change => (
                <React.Fragment key={change.id}>
                  <tr className="align-top hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                      {new Date(change.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-900">{change.businessName || change.merchantId}</td>
                    <td className="px-4 py-4 text-gray-700">{LABELS[change.field] || change.field}</td>
                    <td className="max-w-52 px-4 py-4 text-gray-500"><FileOrValue value={change.before} change={change} /></td>
                    <td className="max-w-52 px-4 py-4 text-gray-900"><FileOrValue value={change.after} change={change} /></td>
                    <td className="px-4 py-4">
                      <span className={change.status === "LIVE" ? "font-medium text-green-700" : change.status === "REJECTED" ? "font-medium text-red-700" : "text-gray-500"}>
                        {change.status === "LIVE" ? "Live" : change.status === "REJECTED" ? "Rejected" : "Replaced"}
                      </span>
                      {change.rejectionReason && <p className="mt-1 max-w-48 text-xs text-gray-500">{change.rejectionReason}</p>}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {change.status === "LIVE" && <button type="button"
                        onClick={() => { setSelectedId(selectedId === change.id ? null : change.id); setReason(""); }}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                        Reject
                      </button>}
                    </td>
                  </tr>
                  {selectedId === change.id && (
                    <tr>
                      <td colSpan={7} className="bg-gray-50 px-5 py-4">
                        <div className="flex flex-wrap items-end gap-3">
                          <label className="min-w-48 flex-1 text-xs font-medium text-gray-700">
                            Reason for rejection
                            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                              placeholder="Explain what needs correcting" className="mt-2 block w-full rounded-lg border border-gray-300 bg-white p-3 text-sm" />
                          </label>
                          <button type="button" disabled={saving || reason.trim().length < 4} onClick={() => void reject(change.id)}
                            className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                            {saving ? "Rejecting…" : "Confirm rejection"}
                          </button>
                          <button type="button" onClick={() => setSelectedId(null)}
                            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700">Cancel</button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">The previous valid version is restored. The merchant receives the reason.</p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {!response.items.length && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-500">No matching profile changes.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 text-sm text-gray-500">
        <span>{response.total} total update{response.total === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage(v => v - 1)}
            className="rounded-md border border-gray-200 px-3 py-1.5 disabled:opacity-40">Previous</button>
          <span>Page {page}</span>
          <button type="button" disabled={page * 20 >= response.total} onClick={() => setPage(v => v + 1)}
            className="rounded-md border border-gray-200 px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      </div>
    </section>
  );
}
