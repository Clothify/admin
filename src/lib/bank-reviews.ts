import { apiFetch } from "./api";

export type PendingMerchantBank = {
  id: string;
  merchantId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  createdAt: string;
  reviewStatus: "PENDING" | "LEGACY";
  merchant: { id: string; businessName: string };
  cac: { id: string; status: string; registeredName: string | null } | null;
};

export function fetchPendingMerchantBanks(page = 1) {
  return apiFetch<{ items: PendingMerchantBank[]; total: number; page: number; limit: number }>("/admin/merchant-bank-accounts/pending", { query: { page } });
}

export function reviewMerchantBank(id: string, status: "APPROVED" | "REJECTED", reason?: string) {
  return apiFetch(`/admin/merchant-bank-accounts/${encodeURIComponent(id)}/review`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
}
