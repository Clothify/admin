'use client';

import * as React from 'react';
import { Pencil, Settings2, X } from 'lucide-react';
import { DM_Sans } from 'next/font/google';
import { apiFetch } from '@/lib/api';
import CopyableCell from '@/components/dashboard/tables/CopyableCell';
import ModalBase from '@/components/dashboard/modals/ModalBase';
import { TableLoadingState } from '@/components/dashboard/ui/LoadingState';

const dmSans = DM_Sans({ subsets: ['latin'] });

/* ----------------------------- helpers / types ----------------------------- */
type ReferralRow = {
  id: string;
  referrerName: string;
  referredName: string;
  dateISO: string;
  rewardAmount: number;
};
type SettingsHistoryRow = {
  id: string;
  initialAmount: number;
  updatedAmount: number;
  adminName: string;
  changedAtISO: string;
};
type ReferralListRow = {
  id: string;
  name: string;
  email: string | null;
  activeCount: number;
  rewardEarned: number;
};
type ReferralOverview = {
  settings: { rewardAmount: number; history: SettingsHistoryRow[] };
  totals: {
    totalReferrals: number;
    totalActive: number;
    thisMonth: number;
    estimatedReward: number;
  };
  referrals: ReferralRow[];
  referrers: ReferralListRow[];
};

const naira0 = (v: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(v);

const naira2 = (v: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const fmtDT = (iso: string) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB');
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} (${time})`;
};

/* --------------------------------- modals --------------------------------- */
function ModalShell({
  open,
  onClose,
  widthClass = 'max-w-[720px]',
  children,
}: {
  open: boolean;
  onClose: () => void;
  widthClass?: string;
  children: React.ReactNode;
}) {
  const width = Number(widthClass.match(/\d+/)?.[0] || 720);
  return <ModalBase open={open} onClose={onClose} width={width} z={80} ariaLabel="Referral dialog"><div className="max-h-[calc(100vh-2rem)] overflow-y-auto">{children}</div></ModalBase>;
}

function EditRewardModal({
  open,
  current,
  onClose,
  onUpdate,
}: {
  open: boolean;
  current: number;
  onClose: () => void;
  onUpdate: (v: number) => void;
}) {
  const [value, setValue] = React.useState<string>('');
  React.useEffect(() => setValue(''), [open]);

  return (
    <ModalShell open={open} onClose={onClose} widthClass="max-w-[540px]">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Referral Amount</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-gray-900">
            <span className="text-sm">Current Reward </span>
            <span className="font-semibold">{naira2(current)}</span>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Input new Amount</label>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Input new reward amount"
              className="w-full h-11 rounded-lg border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => {
              const n = parseInt(value.replace(/\D/g, ''), 10);
              if (!isNaN(n)) onUpdate(n);
              onClose();
            }}
            className="w-full h-12 rounded-lg bg-[#0B1E53] text-white font-medium"
          >
            Update
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function SettingsHistoryModal({
  open,
  onClose,
  rows,
}: {
  open: boolean;
  onClose: () => void;
  rows: SettingsHistoryRow[];
}) {
  return (
    <ModalShell open={open} onClose={onClose} widthClass="max-w-[900px]">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Settings history</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* borderless list */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm border-collapse">
            <thead>
              <tr className="text-gray-500">
                <th className="py-2 px-3 font-normal">Initial Amount</th>
                <th className="py-2 px-3 font-normal">Admin Name</th>
                <th className="py-2 px-3 font-normal">Date and Time of Change</th>
                <th className="py-2 px-3 font-normal">Updated Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={4} className="py-4 px-3 text-gray-600">No settings history is available.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-3 px-3 text-gray-900"><CopyableCell value={naira0(r.initialAmount)} label="initial amount" /></td>
                  <td className="py-3 px-3 text-gray-900"><CopyableCell value={r.adminName} label="administrator name" /></td>
                  <td className="py-3 px-3 text-gray-900"><CopyableCell value={fmtDT(r.changedAtISO)} label="date and time" /></td>
                  <td className="py-3 px-3 text-gray-900"><CopyableCell value={naira0(r.updatedAmount)} label="updated amount" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModalShell>
  );
}

function ReferralListModal({
  open,
  onClose,
  rows,
}: {
  open: boolean;
  onClose: () => void;
  rows: ReferralListRow[];
}) {
  return (
    <ModalShell open={open} onClose={onClose} widthClass="max-w-[980px]">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Referral List</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* borderless list */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm border-collapse">
            <thead>
              <tr className="text-gray-500">
                <th className="py-2 px-3 font-normal">Referral Name</th>
                <th className="py-2 px-3 font-normal">Email Address</th>
                <th className="py-2 px-3 font-normal">Active referrals shown</th>
                <th className="py-2 px-3 font-normal">Estimated reward</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-3 px-3 text-gray-900"><CopyableCell value={r.name} label="referral name" /></td>
                  <td className="py-3 px-3 text-gray-900">{r.email ? <CopyableCell value={r.email} label="email address" /> : '-'}</td>
                  <td className="py-3 px-3 text-gray-900"><CopyableCell value={r.activeCount} label="active referral count" /></td>
                  <td className="py-3 px-3 text-gray-900"><CopyableCell value={naira2(r.rewardEarned)} label="estimated reward" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModalShell>
  );
}

/* ------------------------------- HEADER ----------------------------------- */

type HeaderProps = {
  reward: number;
  totals: ReferralOverview['totals'];
  onOpenEdit: () => void;
  onOpenHistory: () => void;
  onOpenList: () => void;
};

function ReferralHeader({
  reward,
  totals,
  onOpenEdit,
  onOpenHistory,
  onOpenList,
}: HeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2">
          <div>
            <div className="text-sm text-gray-600">Referral reward rate</div>
            <div className="text-xl font-semibold text-[#0B1E53]">{naira2(reward)}</div>
          </div>
          <button
            type="button"
            aria-label="Edit referral reward"
            onClick={onOpenEdit}
            className="grid h-9 w-9 place-items-center rounded-md text-[#0B1E53] hover:bg-slate-100"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={onOpenHistory}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-[#0B1E53] hover:bg-gray-50"
          type="button"
        >
          <Settings2 className="h-4 w-4" />
          Settings history
        </button>
      </div>

      <div>
        <p className="text-sm text-gray-600">Figures cover up to 200 of the latest referrals.</p>
        <div className="mt-2 grid divide-y divide-gray-100 sm:grid-cols-3 sm:gap-x-4 sm:divide-y-0">
          <MetricInline
            label="Referrals shown"
            value={totals.totalReferrals.toLocaleString()}
            rightLink="See referrers"
            onRightLink={onOpenList}
          />

          <MetricInline
            label="Estimated referral rewards"
            value={naira2(totals.estimatedReward)}
            sub={`Active referrals shown (${totals.totalActive.toLocaleString()}) at the current rate`}
          />

          <MetricInline
            label="Referrals this month"
            value={totals.thisMonth.toLocaleString()}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */
export default function ReferralTab() {
  const [overview, setOverview] = React.useState<ReferralOverview | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const loadReferrals = React.useCallback(async () => {
    setLoadError(null);
    try {
      setOverview(await apiFetch<ReferralOverview>('/admin/referrals'));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load referrals');
    }
  }, []);

  React.useEffect(() => {
    void loadReferrals();
  }, [loadReferrals]);

  const updateReward = async (amount: number) => {
    try {
      await apiFetch('/admin/referrals/settings', { method: 'PUT', body: JSON.stringify({ rewardAmount: amount }) });
      setMessage('Referral reward updated.');
      await loadReferrals();
    } catch (err: any) {
      setMessage(err?.message || 'Unable to update referral reward');
    }
  };

  // modal state kept at parent and passed to header
  const [editOpen, setEditOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [listOpen, setListOpen] = React.useState(false);

  const loadErrorMessage = loadError && (
    <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
      <span>{loadError}</span>
      <button type="button" onClick={loadReferrals} className="font-medium text-[#0B1E53] underline">Retry</button>
    </div>
  );

  if (!overview) {
    return (
      <div className={`${dmSans.className} rounded-xl bg-white px-6 py-5`}>
        {loadErrorMessage || <TableLoadingState columns={4} label="Loading referrals" />}
      </div>
    );
  }

  const { settings, totals, referrals, referrers } = overview;

  return (
    <div className={`${dmSans.className} space-y-4 rounded-xl bg-white px-6 py-5`}>
      <ReferralHeader
        reward={settings.rewardAmount}
        totals={totals}
        onOpenEdit={() => setEditOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenList={() => setListOpen(true)}
      />

      {message && <p role="status" className="text-sm text-gray-700">{message}</p>}
      {loadErrorMessage}

      {/* list */}
      <div>
        <div className="mb-3 font-medium text-gray-900">Referral Details</div>
        <div className="rounded-xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-sm border-collapse">
              <thead className=' border rounded-2xl border-gray-200'>
                <tr className="text-gray-500">
                  <th className="py-3 px-4 font-normal">Referrer Name</th>
                  <th className="py-3 px-4 font-normal">Referred User Name</th>
                  <th className="py-3 px-4 font-normal">Referral Date</th>
                  <th className="py-3 px-4 font-normal">Current reward rate</th>
                </tr>
              </thead>
              <tbody>
                {referrals.length === 0 && (
                  <tr><td colSpan={4} className="py-4 px-4 text-gray-600">No referrals yet.</td></tr>
                )}
                {referrals.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setListOpen(true)}
                  >
                    <td className="py-3 px-4 text-gray-900"><CopyableCell value={r.referrerName} label="referrer name" /></td>
                    <td className="py-3 px-4 text-gray-900"><CopyableCell value={r.referredName} label="referred user name" /></td>
                    <td className="py-3 px-4 text-gray-900"><CopyableCell value={fmtDT(r.dateISO)} label="referral date" /></td>
                    <td className="py-3 px-4 text-gray-900"><CopyableCell value={naira2(r.rewardAmount)} label="current reward rate" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* modals */}
      <EditRewardModal
        open={editOpen}
        current={settings.rewardAmount}
        onClose={() => setEditOpen(false)}
        onUpdate={updateReward}
      />
      <SettingsHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        rows={settings.history}
      />
      <ReferralListModal
        open={listOpen}
        onClose={() => setListOpen(false)}
        rows={referrers}
      />
    </div>
  );
}

/* ------------------------------ subcomponents ------------------------------ */

function MetricInline({
  label,
  value,
  sub,
  rightLink,
  onRightLink,
}: {
  label: string;
  value: string;
  sub?: string;
  rightLink?: string;
  onRightLink?: () => void;
}) {
  return (
    <div className="min-w-0 py-2">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-1 text-[22px] font-semibold text-[#0B1E53]">{value}</div>
      {sub && <p className="mt-1 text-xs text-gray-600">{sub}</p>}
      {rightLink && (
        <button
          type="button"
          onClick={onRightLink}
          className="mt-1 text-xs text-[#0B1E53] underline underline-offset-2"
        >
          {rightLink}
        </button>
      )}
    </div>
  );
}
