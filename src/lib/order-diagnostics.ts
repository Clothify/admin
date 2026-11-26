import { apiFetch } from "./api";

export type OrderDiagnosticKind = "DISCREPANCY" | "ADMIN_WAITING" | "FINANCE_REVIEW";
export type OrderDiagnosticFinding = { code: string; kind: OrderDiagnosticKind };
export type OrderDiagnosticItem = {
  orderId: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  findings: OrderDiagnosticFinding[];
};
export type OrderDiagnosticPage = {
  generatedAt: string;
  graceMinutes: number;
  scanned: number;
  hasMore: boolean;
  nextCursor: string | null;
  items: OrderDiagnosticItem[];
};

export function fetchOrderDiagnostics(cursor?: string) {
  return apiFetch<OrderDiagnosticPage>("/admin/order-diagnostics", { query: { limit: 25, cursor } });
}

export function nextDiagnosticsCursor(page: OrderDiagnosticPage, currentCursor?: string) {
  if (!page.hasMore || !page.nextCursor || page.nextCursor === currentCursor) return null;
  return page.nextCursor;
}

const findingLabels: Record<string, string> = {
  READY_WITHOUT_DISPATCH: "Ready without dispatch",
  READY_WITH_OFFER: "Ready despite rider offer",
  LOCATION_CONFIRMED_BUT_WAITING: "Confirmed location still waiting",
  NO_ACTIVE_RIDER_OFFER: "No active rider offer",
  EXPIRED_OFFERS_NO_RECOVERY: "Expired offers without recovery",
  DISPATCH_AWAITING_ADMIN: "Dispatch needs Admin",
  QUOTE_LINES_MISSING: "Quote lines missing",
  PAYMENT_LEDGER_REVIEW: "Payment ledger review",
  MERCHANT_EARNINGS_REVIEW: "Merchant earnings review",
  TERMINAL_EVIDENCE_CONFLICT: "Terminal evidence conflict",
};

export function diagnosticFindingLabel(code: string) {
  return findingLabels[code] || code.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
