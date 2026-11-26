import { ApiList, apiFetch } from "./api";

export type FinanceSummary = {
  range: { from: string; to: string };
  currency: "NGN";
  unit: "KOBO";
  grossVolume: number;
  merchantServiceValue: number;
  logisticsFees: number;
  merchantCommissions: number;
  deliverySpeedFees: number;
  cancellationFees: number;
  merchantPayouts: number;
  riderPayouts: number;
  refunds: number;
  netPlatformRevenue: number;
  recordedPlatformRevenue?: number;
  walletRefundCredits?: number;
  paidOrders: number;
  changes: {
    grossVolume: number;
    netPlatformRevenue: number;
    recordedPlatformRevenue?: number;
    paidOrders: number;
  };
  pendingWithdrawals: { count: number; amount: number };
};

export type RevenuePoint = {
  date: string;
  grossVolume: number;
  merchantPayouts: number;
  riderPayouts: number;
  refunds: number;
  netPlatformRevenue: number;
  recordedPlatformRevenue?: number;
};

export type Reconciliation = {
  generatedAt: string;
  walletLiabilities: { users: number; merchants: number; riders: number };
  reservedWithdrawals: { count: number; amount: number };
  anomalies: { negativeWallets: number; staleWithdrawals: number };
};

export type AccountReconciliation = {
  owner: "USER" | "MERCHANT" | "RIDER";
  accountId: string;
  currency: "NGN";
  unit: "KOBO";
  storedBalance: number;
  openingBalance: number | null;
  openingBalanceVerified: false;
  reconstructedFromUnverifiedOpening: number | null;
  pageSize: number;
  nextCursor: string | null;
  status: "DISCREPANCY" | "UNVERIFIABLE" | "SNAPSHOT_CONSISTENT_OPENING_UNVERIFIED";
  anomalies: { kind: string; transactionId?: string }[];
};

export type Withdrawal = {
  id: string;
  amount: number;
  currency: string;
  status: "PENDING_OTP" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REJECTED";
  reference?: string | null;
  transferRef?: string | null;
  transferCode?: string | null;
  failureReason?: string | null;
  reviewReason?: string | null;
  pendingReason?: "APPROVAL_REQUIRED" | "PROVIDER_CONFIRMATION" | string | null;
  reconciliationRequired?: boolean;
  refundConfirmed?: boolean;
  otpVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  bankAccount: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  merchant?: {
    id: string;
    businessName: string;
    walletBalance: number;
    account: { email?: string | null; phone?: string | null };
  } | null;
  rider?: {
    id: string;
    firstName: string;
    lastName: string;
    walletBalance: number;
    account: { email?: string | null; phone?: string | null };
  } | null;
};

type Range = { from?: string; to?: string };

export function fetchFinanceSummary(range: Range) {
  return apiFetch<FinanceSummary>("/admin/finance/summary", { query: range });
}

export function fetchRevenueSeries(range: Range) {
  return apiFetch<RevenuePoint[]>("/admin/finance/revenue-series", { query: range });
}

export function fetchReconciliation() {
  return apiFetch<Reconciliation>("/admin/finance/reconciliation");
}

export function fetchAccountReconciliation(owner: AccountReconciliation["owner"], accountId: string, after?: string) {
  return apiFetch<AccountReconciliation>(
    `/admin/finance/reconciliation/accounts/${owner}/${encodeURIComponent(accountId)}`,
    { query: after ? { after } : {} },
  );
}

export function fetchWithdrawals(params: Range & {
  page: number;
  limit: number;
  status?: string;
  owner?: string;
}) {
  return apiFetch<ApiList<Withdrawal>>("/admin/finance/withdrawals", { query: params });
}

export function fetchWithdrawal(id: string) {
  return apiFetch<Withdrawal>(`/admin/withdrawals/${encodeURIComponent(id)}`);
}

export function approveWithdrawal(id: string) {
  return apiFetch(`/admin/withdrawals/${id}/approve`, { method: "PATCH" });
}

export function rejectWithdrawal(id: string, reason: string) {
  return apiFetch(`/admin/withdrawals/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export function finalizeWithdrawal(id: string, otp: string) {
  return apiFetch(`/admin/withdrawals/${id}/finalize-transfer`, {
    method: "POST",
    body: JSON.stringify({ otp }),
  });
}
