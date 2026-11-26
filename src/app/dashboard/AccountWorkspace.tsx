"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { DM_Sans } from "next/font/google";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { apiFetch, formatDate, formatNaira, formatNigerianPhone, toUserError, type ApiList } from "@/lib/api";
import { setUserStatus } from "@/lib/users";
import { setMerchantStatus, type MerchantDocument } from "@/lib/merchants";
import { setRiderStatus } from "@/lib/riders";
import MerchantProfileUpdatesPanel from "@/components/dashboard/MerchantProfileUpdatesPanel";
import ModalBase from "@/components/dashboard/modals/ModalBase";
import Pagination from "@/components/dashboard/tables/Pagination";
import { TableLoadingState } from "@/components/dashboard/ui/LoadingState";
import { useDashboardPermissions, type AccountDirectory } from "./DashboardState";

const dmSans = DM_Sans({ subsets: ["latin"] });
const directories = { users: "Users", merchants: "Merchants", riders: "Riders" };
const singular = { users: "User", merchants: "Merchant", riders: "Rider" };
const controlClass = "inline-flex min-h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-[#0B1E53] hover:bg-gray-50 disabled:opacity-50";

type Location = { address: string | null; city: string | null; state: string | null };
type Identity = { publicId: string; email: string | null; phone: string | null; isActive: boolean; createdAt: string };
type Customer = Identity & {
  fullName: string | null;
  profile: Location | null;
  lastLoginAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  wallet: {
    balance: number;
    spendThisMonth: number;
    transactions: { id: string; type: string; source: string; amount: number; reference: string | null; createdAt: string }[];
  };
  orders: { total: number; active: number; completed: number; cancelled: number };
  virtualAccount: { bankName: string; accountNumber: string } | null;
  savedCards: { id: string; last4: string; cardType: string; bank: string | null; isDefault: boolean }[];
  referralsSummary: {
    referredBy: ReferralContact | null;
    referrals: (ReferralContact & { isActive: boolean; createdAt: string })[];
  };
};
type ReferralContact = { id: string; email: string | null; phone: string | null; userProfile: { fullName: string } | null };
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number | null;
  createdAt: string;
  merchant?: { businessName: string } | null;
  user?: { userProfile: { fullName: string } | null };
};
type Assignment = {
  id: string;
  role: string;
  status: string;
  assignedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  riderPayout: number | null;
  order: { orderNumber: string; merchant: { businessName: string } };
};
type Partner = Location & {
  account: Identity;
  status: "VERIFIED" | "PENDING" | "REJECTED" | "SUSPENDED";
  isOnline: boolean;
  onboardingSubmittedAt: string | null;
  walletBalance: number;
  earnings: { today: number; thisWeek: number; thisMonth: number };
  withdrawals: { thisWeek: number; thisMonth: number };
  documents: MerchantDocument[];
};
type MerchantProfile = Partner & {
  businessName: string;
  businessEmail: string | null;
  businessPhone: string | null;
  category: string | null;
  isExclusiveCapable: boolean;
  description: string | null;
  orders: { today: number; thisWeek: number };
  prices: { id: string; clothTypeId: string; clothType: { displayName: string }; serviceType: string; pricePerUnit: number }[];
  reviews: { id: string; createdAt: string; rating: number; comment: string | null; user: { fullName: string } | null }[];
};
type RiderProfile = Partner & {
  firstName: string;
  lastName: string;
  phone: string | null;
  vehicleType: string | null;
  deliveries: { today: number; thisWeek: number };
};
type Profile =
  | { directory: "users"; account: Customer }
  | { directory: "merchants"; account: MerchantProfile }
  | { directory: "riders"; account: RiderProfile };

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos",
});
const dateTime = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? dateFormatter.format(new Date(value)) : "-";
const label = (value?: string | null) => value ? value.toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase()) : "-";
const location = (address?: Location | null) => [address?.address, address?.city, address?.state].filter(Boolean).join(", ");
const contact = (person: ReferralContact) => person.userProfile?.fullName || person.email || person.phone || "User";
const publicDocumentUrl = (value: string) => /^https:\/\//i.test(value) ? value : undefined;

function FieldList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([title, value]) => (
        <div className="min-w-0" key={title}>
          <dt className="text-sm text-slate-600">{title}</dt>
          <dd className="mt-0.5 break-words font-medium text-slate-950">{value ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProfileSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={id + "-title"} className="scroll-mt-32 rounded-xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
      <h2 id={id + "-title"} className="mb-4 font-semibold text-[#0B1E53]">{title}</h2>
      {children}
    </section>
  );
}

function Records({ rows, empty }: { rows: { id: string; primary: ReactNode; detail: ReactNode; trailing?: ReactNode }[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-slate-600">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map(row => (
        <li key={row.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3">
          <div className="min-w-0">
            <p className="break-words font-medium text-slate-900">{row.primary}</p>
            <p className="break-words text-sm text-slate-600">{row.detail}</p>
          </div>
          {row.trailing && <span className="text-sm font-medium text-slate-800">{row.trailing}</span>}
        </li>
      ))}
    </ul>
  );
}

function MerchantPricing({ prices }: { prices: MerchantProfile["prices"] }) {
  const [search, setSearch] = useState("");
  const [service, setService] = useState("");
  const [page, setPage] = useState(1);
  const services = [...new Set(prices.map(price => price.serviceType))].sort();
  const types = [...new Map(prices.map(price => [price.clothTypeId, { id: price.clothTypeId, name: price.clothType.displayName }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
  const matching = types.filter(type => type.name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (!service || prices.some(price => price.clothTypeId === type.id && price.serviceType === service)));
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
  const visible = matching.slice((page - 1) * pageSize, page * pageSize);

  return <div>
    <p className="text-sm text-slate-600">{types.length} cloth types · {prices.length} prices</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <input aria-label="Search cloth types" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search cloth type" className="min-h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm" />
      <select aria-label="Filter services" value={service} onChange={event => { setService(event.target.value); setPage(1); }} className={controlClass}>
        <option value="">All services</option>
        {services.map(item => <option key={item} value={item}>{label(item)}</option>)}
      </select>
    </div>
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="px-4 py-3">Cloth type</th>{services.filter(item => !service || item === service).map(item => <th key={item} className="px-4 py-3">{label(item)}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{visible.map(type => <tr key={type.id}><th scope="row" className="px-4 py-3 font-medium text-slate-900">{type.name}</th>{services.filter(item => !service || item === service).map(item => {
          const price = prices.find(entry => entry.clothTypeId === type.id && entry.serviceType === item);
          return <td key={item} className="px-4 py-3 text-slate-700">{price ? formatNaira(price.pricePerUnit) : "Unavailable"}</td>;
        })}</tr>)}</tbody>
      </table>
      {!visible.length && <p className="px-4 py-8 text-center text-sm text-slate-600">No prices match these filters.</p>}
    </div>
    {pageCount > 1 && <div className="mt-3 flex items-center justify-between gap-3"><p className="text-sm text-slate-600">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, matching.length)} of {matching.length}</p><Pagination page={page} totalPages={pageCount} onChange={setPage} /></div>}
  </div>;
}

function ProfileHistory({ directory, id }: { directory: AccountDirectory; id: string }) {
  const assignments = directory === "riders";
  const historyType = assignments ? "assignments" : "orders";
  const [filter, setFilter] = useState({ group: "", role: "", status: "", search: "", page: 1 });
  const [reference, setReference] = useState("");
  const [history, setHistory] = useState<ApiList<Order | Assignment> | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setHistory(null);
    setError("");
    apiFetch<ApiList<Order | Assignment>>(`/admin/${directory}/${encodeURIComponent(id)}/${historyType}`, {
      query: {
        page: filter.page,
        limit: 8,
        group: filter.group || undefined,
        role: filter.role || undefined,
        status: filter.status || undefined,
        search: filter.search || undefined,
      },
    }).then(result => {
      if (!current) return;
      const lastPage = Math.max(1, Math.ceil(result.total / result.limit));
      if (filter.page > lastPage) setFilter({ ...filter, page: lastPage });
      else setHistory(result);
    }).catch((reason: unknown) => {
      if (current) setError(toUserError(reason, `Unable to load ${historyType}.`));
    });
    return () => { current = false; };
  }, [id, directory, historyType, filter, retry]);

  const rows = history?.items.map(record => {
    if ("role" in record) {
      return {
        id: record.id,
        primary: record.order.orderNumber,
        detail: (
          <>
            <span className="block">{[label(record.role), label(record.status), record.order.merchant.businessName].join(" · ")}</span>
            <span className="block">
              {[
                `Assigned ${dateTime(record.assignedAt)}`,
                record.acceptedAt && `Accepted ${dateTime(record.acceptedAt)}`,
                record.completedAt && `Completed ${dateTime(record.completedAt)}`,
                record.status === "EXPIRED" && record.expiresAt && `Expired ${dateTime(record.expiresAt)}`,
              ].filter(Boolean).join(" · ")}
            </span>
          </>
        ),
        trailing: record.riderPayout == null ? undefined : `Rider payout ${formatNaira(record.riderPayout)}`,
      };
    }
    const contact = directory === "merchants" ? record.user?.userProfile?.fullName : record.merchant?.businessName;
    return {
      id: record.id,
      primary: record.orderNumber || record.id,
      detail: [contact, dateTime(record.createdAt), label(record.status)].filter(Boolean).join(" · "),
      trailing: record.totalAmount == null ? undefined : `Order total ${formatNaira(record.totalAmount)}`,
    };
  });

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{assignments ? "Assignment history" : "Order history"}</h3>
      <div className="flex flex-wrap items-center gap-2">
        {assignments ? <>
          <select aria-label="Assignment leg" value={filter.role} onChange={event => setFilter({ ...filter, role: event.target.value, page: 1 })} className={controlClass}>
            <option value="">All legs</option>
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
          </select>
          <select aria-label="Assignment status" value={filter.status} onChange={event => setFilter({ ...filter, status: event.target.value, page: 1 })} className={controlClass}>
            <option value="">All statuses</option>
            {["OFFERED", "ACCEPTED", "REJECTED", "COMPLETED", "CANCELLED", "EXPIRED"].map(status => (
              <option key={status} value={status}>{label(status)}</option>
            ))}
          </select>
        </> : (
          <select aria-label="Order status" value={filter.group} onChange={event => setFilter({ ...filter, group: event.target.value, page: 1 })} className={controlClass}>
            <option value="">All orders</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        )}
        {directory !== "users" && (
          <form aria-label={`Search ${historyType}`} className="flex min-w-0 flex-wrap items-center gap-2" onSubmit={event => {
            event.preventDefault();
            setFilter({ ...filter, search: reference.trim(), page: 1 });
          }}>
            <input
              aria-label="Order reference"
              placeholder="Order reference"
              value={reference}
              onChange={event => setReference(event.target.value)}
              maxLength={100}
              className="min-h-9 w-40 max-w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
            />
            <button type="submit" className={controlClass}>Search</button>
            {filter.search && <button type="button" className={controlClass} onClick={() => {
              setReference("");
              setFilter({ ...filter, search: "", page: 1 });
            }}>Clear search</button>}
          </form>
        )}
      </div>
      {error ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm"><span>{error}</span><button type="button" onClick={() => setRetry(retry + 1)} className={controlClass}>Retry</button></div>
      ) : history && rows ? (
        <div className="mt-3">
          <Records empty={`No ${historyType} found.`} rows={rows} />
          {history.total > history.limit && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="text-sm text-slate-600">{history.total.toLocaleString()} {historyType}</p>
              <Pagination page={filter.page} totalPages={Math.ceil(history.total / history.limit)} onChange={page => setFilter({ ...filter, page })} />
            </div>
          )}
        </div>
      ) : <TableLoadingState className="mt-3" label={`Loading ${assignments ? "assignment" : "order"} history`} rows={3} columns={3} />}
    </div>
  );
}

function CustomerSections({ customer, id, canViewOrders }: { customer: Customer; id: string; canViewOrders: boolean }) {
  return (
    <>
      <ProfileSection id="orders" title="Orders">
        <FieldList items={[
          ["Total", customer.orders.total], ["Active", customer.orders.active],
          ["Completed", customer.orders.completed], ["Cancelled", customer.orders.cancelled],
        ]} />
        {canViewOrders && <ProfileHistory directory="users" id={id} />}
      </ProfileSection>
      <ProfileSection id="wallet" title="Wallet and payment methods">
        <FieldList items={[
          ["Balance", formatNaira(customer.wallet.balance)], ["Spent this month", formatNaira(customer.wallet.spendThisMonth)],
          ["Virtual account", customer.virtualAccount ? `${customer.virtualAccount.bankName} · •••• ${customer.virtualAccount.accountNumber.slice(-4)}` : "None"],
          ["Saved cards", customer.savedCards.length ? customer.savedCards.map(card => `${card.cardType} •••• ${card.last4}${card.isDefault ? " (default)" : ""}`).join(", ") : "None"],
        ]} />
        <h3 className="mt-5 text-sm font-semibold text-slate-800">Recent wallet transactions</h3>
        <Records empty="No wallet transactions." rows={customer.wallet.transactions.map(transaction => ({
          id: transaction.id,
          primary: label(transaction.source),
          detail: [dateTime(transaction.createdAt), transaction.reference].filter(Boolean).join(" · "),
          trailing: `${label(transaction.type)} · ${formatNaira(transaction.amount)}`,
        }))} />
      </ProfileSection>
      <ProfileSection id="referrals" title="Referrals">
        <p className="mb-3 text-sm text-slate-700">
          Referred by {customer.referralsSummary.referredBy ? (
            <Link className="font-medium text-[#0B1E53] underline" href={`/dashboard/users/${encodeURIComponent(customer.referralsSummary.referredBy.id)}`}>
              {contact(customer.referralsSummary.referredBy)}
            </Link>
          ) : "no one"}
        </p>
        <Records empty="No referred users." rows={customer.referralsSummary.referrals.map(person => ({
          id: person.id,
          primary: <Link className="text-[#0B1E53] underline" href={`/dashboard/users/${encodeURIComponent(person.id)}`}>{contact(person)}</Link>,
          detail: dateTime(person.createdAt),
          trailing: person.isActive ? "Active" : "Inactive",
        }))} />
      </ProfileSection>
    </>
  );
}

function PartnerSections({ profile, id, canReview, canViewOrders }: {
  profile: Extract<Profile, { directory: "merchants" | "riders" }>;
  id: string;
  canReview: boolean;
  canViewOrders: boolean;
}) {
  const { account } = profile;
  const activity = profile.directory === "merchants" ? profile.account.orders : profile.account.deliveries;
  const [updatesOpen, setUpdatesOpen] = useState(false);
  return (
    <>
      <ProfileSection id="activity" title={profile.directory === "merchants" ? "Orders" : "Assignments"}>
        <FieldList items={profile.directory === "merchants"
          ? [["Today", activity.today], ["This week", activity.thisWeek]]
          : [["Completed today", activity.today], ["Completed this week", activity.thisWeek]]} />
        {canViewOrders && <ProfileHistory directory={profile.directory} id={id} />}
      </ProfileSection>
      <ProfileSection id="earnings" title="Earnings and withdrawals">
        <FieldList items={[
          ["Wallet balance", formatNaira(account.walletBalance)], ["Earnings today", formatNaira(account.earnings.today)],
          ["Earnings this week", formatNaira(account.earnings.thisWeek)], ["Earnings this month", formatNaira(account.earnings.thisMonth)],
          ["Paid out this week", formatNaira(account.withdrawals.thisWeek)], ["Paid out this month", formatNaira(account.withdrawals.thisMonth)],
        ]} />
      </ProfileSection>
      <ProfileSection id="documents" title="Documents">
        <Records empty="No documents submitted." rows={account.documents.map(document => {
          const url = publicDocumentUrl(document.url);
          return {
            id: document.id, primary: label(document.type),
            detail: [label(document.status), formatDate(document.createdAt), document.metadata?.reviewReason].filter(Boolean).join(" · "),
            trailing: url && <a href={url} rel="noopener noreferrer" target="_blank" className="inline-flex items-center gap-1 text-[#0B1E53] underline">View <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a>,
          };
        })} />
      </ProfileSection>
      {profile.directory === "merchants" && (
        <>
          <ProfileSection id="pricing" title="Services and pricing">
            <MerchantPricing prices={profile.account.prices} />
          </ProfileSection>
          <ProfileSection id="reviews" title="Recent reviews">
            <Records empty="No reviews yet." rows={profile.account.reviews.map(review => ({
              id: review.id,
              primary: review.user?.fullName || "Customer",
              detail: [formatDate(review.createdAt), review.comment].filter(Boolean).join(" · "),
              trailing: `${review.rating} / 5`,
            }))} />
          </ProfileSection>
          <div id="updates" className="scroll-mt-32">
            <button type="button" aria-expanded={updatesOpen} onClick={() => setUpdatesOpen(value => !value)} className={controlClass}>
              {updatesOpen ? "Hide profile updates" : "View profile updates"}
            </button>
            {updatesOpen && <div className="mt-3"><MerchantProfileUpdatesPanel merchantId={id} canReview={canReview} /></div>}
          </div>
        </>
      )}
    </>
  );
}

async function loadProfile(directory: AccountDirectory, id: string): Promise<Profile> {
  const endpoint = `/admin/${directory}/${encodeURIComponent(id)}`;
  if (directory === "users") return { directory, account: await apiFetch<Customer>(endpoint) };
  if (directory === "merchants") return { directory, account: await apiFetch<MerchantProfile>(endpoint) };
  return { directory, account: await apiFetch<RiderProfile>(endpoint) };
}

export default function AccountWorkspace({ directory, id }: { directory: AccountDirectory; id: string }) {
  const permissions = useDashboardPermissions();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    setError("");
    loadProfile(directory, id).then(result => {
      if (current) setProfile(result);
    }).catch((reason: unknown) => {
      if (current) setError(toUserError(reason, "Unable to load the account."));
    });
    return () => { current = false; };
  }, [directory, id, revision]);

  const backLink = <Link href={`/dashboard/${directory}`} className="inline-flex items-center gap-2 text-sm font-medium text-[#0B1E53] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to {directories[directory].toLowerCase()}</Link>;
  if (error || !profile) {
    return (
      <div className={`${dmSans.className} space-y-4`}>
        {backLink}
        {error ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-5 text-sm">
            {error}<button type="button" className={controlClass} onClick={() => setRevision(value => value + 1)}>Retry</button>
          </div>
        ) : <TableLoadingState label="Loading account profile" columns={3} />}
      </div>
    );
  }

  const identity = profile.directory === "users" ? profile.account : profile.account.account;
  const status = profile.directory === "users" ? (identity.isActive ? "ACTIVE" : "SUSPENDED") : profile.account.status;
  const name = profile.directory === "users" ? profile.account.fullName || identity.email || "User"
    : profile.directory === "merchants" ? profile.account.businessName : `${profile.account.firstName} ${profile.account.lastName}`.trim() || "Rider";
  const canChangeStatus = permissions.includes(directory + ".manage") && ["SUSPENDED", "ACTIVE", "VERIFIED"].includes(status);
  const reactivate = status === "SUSPENDED";
  const action = reactivate ? "Activate" : "Suspend";

  const changeStatus = async () => {
    setSaving(true);
    setStatusError("");
    try {
      const next = reactivate ? "verified" : "suspended";
      if (directory === "users") await setUserStatus(id, next);
      else if (directory === "merchants") await setMerchantStatus(id, next);
      else await setRiderStatus(id, next);
      setConfirm(false);
      setProfile(null);
      setRevision(value => value + 1);
    } catch (reason) {
      setStatusError(toUserError(reason, "Unable to update account status."));
    } finally {
      setSaving(false);
    }
  };

  const sections = directory === "users"
    ? [["overview", "Account"], ["orders", "Orders"], ["wallet", "Wallet"], ["referrals", "Referrals"]]
    : [
      ["overview", "Account"], ["activity", directory === "merchants" ? "Orders" : "Assignments"],
      ["earnings", "Earnings"], ["documents", "Documents"],
      ...(directory === "merchants" ? [["pricing", "Pricing"], ["reviews", "Reviews"], ["updates", "Profile updates"]] : []),
    ];

  return (
    <div className={`${dmSans.className} space-y-4`}>
      {backLink}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-semibold tracking-tight text-[#0B1E53]">{name}</h2>
          <p className="mt-1 text-sm text-slate-600">{identity.publicId} · {label(status)}</p>
        </div>
        {canChangeStatus && <button type="button" className={controlClass} onClick={() => { setStatusError(""); setConfirm(true); }}>{action} account</button>}
      </div>
      <nav aria-label="Account profile sections" className="flex flex-wrap gap-x-4 gap-y-2 border-b border-slate-200 pb-3 text-sm">
        {sections.map(([anchor, title]) => <a key={anchor} href={"#" + anchor} className="font-medium text-[#0B1E53] hover:underline">{title}</a>)}
      </nav>
      <ProfileSection id="overview" title="Account details">
        <FieldList items={[
          ["Email", profile.directory === "merchants" ? profile.account.businessEmail || identity.email : identity.email],
          ["Phone", formatNigerianPhone(profile.directory === "merchants" ? profile.account.businessPhone || identity.phone : profile.directory === "riders" ? profile.account.phone || identity.phone : identity.phone)],
          ["Address", location(profile.directory === "users" ? profile.account.profile : profile.account) || "-"],
          ["Joined", formatDate(identity.createdAt)],
          ...(profile.directory === "users" ? [
            ["Last sign-in", dateTime(profile.account.lastLoginAt)],
            ...(profile.account.suspendedAt ? [["Suspended on", dateTime(profile.account.suspendedAt)], ["Suspension reason", profile.account.suspendedReason]] : []),
          ] : [
            ["Availability", profile.account.isOnline ? "Online" : "Offline"],
            ["Onboarding submitted", formatDate(profile.account.onboardingSubmittedAt)],
            ...(profile.directory === "merchants" ? [
              ["Category", label(profile.account.category)],
              ["Exclusive garment handling", profile.account.isExclusiveCapable ? "Enabled" : "Disabled"],
              ["Description", profile.account.description],
            ] : [["Vehicle", label(profile.account.vehicleType)]]),
          ]) as [string, ReactNode][],
        ]} />
      </ProfileSection>
      {profile.directory === "users"
        ? <CustomerSections customer={profile.account} id={id} canViewOrders={permissions.includes("orders.read")} />
        : <PartnerSections profile={profile} id={id} canReview={permissions.includes("merchants.review")} canViewOrders={permissions.includes("orders.read")} />}
      {confirm && (
        <ModalBase open onClose={() => { if (!saving) setConfirm(false); }} width={440} ariaLabel={action + " account"}>
          <div className="space-y-4 p-5">
            <h3 className="font-semibold text-[#0B1E53]">{action} {singular[directory].toLowerCase()} account?</h3>
            <p className="text-sm text-slate-700">{name}</p>
            {statusError && <p role="alert" className="text-sm text-red-700">{statusError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={saving} className={controlClass} onClick={() => setConfirm(false)}>Cancel</button>
              <button type="button" disabled={saving} className="min-h-9 rounded-lg bg-[#0B1E53] px-4 text-sm font-medium text-white disabled:opacity-50" onClick={() => void changeStatus()}>{saving ? "Saving…" : action}</button>
            </div>
          </div>
        </ModalBase>
      )}
    </div>
  );
}
