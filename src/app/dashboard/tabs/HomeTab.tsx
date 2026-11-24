"use client";

import * as React from "react";
import { Car, ClipboardList, Landmark, LifeBuoy, ShoppingCart, Store, Users } from "lucide-react";
import StatCard from "@/components/dashboard/cards/StatCard";
import MetricCard from "@/components/dashboard/cards/MetricCard";
import DonutChart from "@/components/dashboard/charts/DonutChart";
import { DashboardContentLoadingState } from "@/components/dashboard/ui/LoadingState";
import { apiFetch, formatNaira } from "@/lib/api";
import { fetchFinanceSummary, type FinanceSummary } from "@/lib/finance";

type Period = "" | "week" | "last-week" | "month";

type DashboardMetrics = {
  range: { from: string; to: string } | null;
  users: number;
  merchants: number;
  riders: number;
  pendingApprovals: { merchants: number; riders: number };
  orders: { active: number; completed: number; cancelled: number; today: number; inPeriod: number | null };
  support: { openComplaints: number };
};

export default function HomeTab({ permissions = [] }: { permissions?: string[] }) {
  const canViewFinance = permissions.includes("finance.read");
  const [period, setPeriod] = React.useState<Period>("");
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [finance, setFinance] = React.useState<FinanceSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setMetrics(null);
    setFinance(null);

    const metricsRequest = apiFetch<DashboardMetrics>("/admin/dashboard/metrics", {
      query: { period: period || undefined },
    }).then(result => {
      if (period && !result.range) throw new Error("Period figures are unavailable.");
      return result;
    });

    Promise.allSettled([
      metricsRequest,
      !canViewFinance
        ? Promise.resolve(null)
        : period
          ? metricsRequest.then(result => fetchFinanceSummary(result.range ?? {}))
          : fetchFinanceSummary({}),
    ]).then(([metricsResult, financeResult]) => {
      if (!alive) return;
      if (metricsResult.status === "fulfilled") {
        setMetrics(metricsResult.value);
      } else {
        setError(metricsResult.reason?.message || "Unable to load dashboard metrics");
      }
      if (financeResult.status === "fulfilled") setFinance(financeResult.value);
      setLoading(false);
    });

    return () => { alive = false; };
  }, [canViewFinance, period]);

  const users = Number(metrics?.users ?? 0);
  const merchants = Number(metrics?.merchants ?? 0);
  const riders = Number(metrics?.riders ?? 0);
  const pendingMerchants = Number(metrics?.pendingApprovals?.merchants ?? 0);
  const pendingRiders = Number(metrics?.pendingApprovals?.riders ?? 0);
  const activeOrders = Number(metrics?.orders?.active ?? 0);
  const completedOrders = Number(metrics?.orders?.completed ?? 0);
  const cancelledOrders = Number(metrics?.orders?.cancelled ?? 0);
  const createdOrders = Number((period ? metrics?.orders?.inPeriod : metrics?.orders?.today) ?? 0);
  const openComplaints = Number(metrics?.support?.openComplaints ?? 0);
  const show = (value: number) => metrics ? value.toLocaleString("en-NG") : "-";
  const change = finance?.changes?.netPlatformRevenue;
  const revenueChange = typeof change === "number" && Number.isFinite(change)
    ? (change >= 0 ? "+" : "") + change.toFixed(1) + "%"
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-[#172033]">
            Platform snapshot
          </h2>
          <p className="mt-1 text-[13px] text-[#667085]">
            {period ? "Counts reflect records created in the selected period." : "Key figures and items requiring attention."}
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-[#475467]">
          <span>Period</span>
          <select
            value={period}
            onChange={event => {
              setLoading(true);
              setPeriod(event.target.value as Period);
            }}
            className="min-h-9 rounded-md border border-[#E7E9EE] bg-white px-3 text-sm font-medium text-[#071D59]"
          >
            <option value="">Latest available figures</option>
            <option value="week">This week</option>
            <option value="last-week">Last week</option>
            <option value="month">This month</option>
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? <DashboardContentLoadingState label="Loading dashboard overview" /> : !metrics ? (
        <div className="rounded-xl border border-[#E7E9EE] bg-white px-5 py-10 text-center text-sm text-[#667085]">
          Dashboard figures are unavailable. Reload the page to try again.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <MetricCard
              icon={<ShoppingCart className="h-[18px] w-[18px]" />}
              title="Active orders"
              value={show(activeOrders)}
              detail="Currently in progress"
            />
            <MetricCard
              icon={<ClipboardList className="h-[18px] w-[18px]" />}
              title={period ? "Orders created" : "Orders today"}
              value={show(createdOrders)}
              detail={period ? "Created in the selected period" : "Created today"}
            />
            <MetricCard
              icon={<LifeBuoy className="h-[18px] w-[18px]" />}
              title="Open complaints"
              value={show(openComplaints)}
              detail="Waiting for resolution"
            />
            {canViewFinance ? (
              <MetricCard
                icon={<Landmark className="h-[18px] w-[18px]" />}
                title="Net platform revenue"
                value={finance ? formatNaira(Number(finance.netPlatformRevenue ?? 0)) : "-"}
                detail={finance ? period ? "Selected period" : "Month to date" : "Finance data unavailable"}
                change={revenueChange}
                isPositive={Number(change ?? 0) >= 0}
              />
            ) : (
              <MetricCard
                icon={<ShoppingCart className="h-[18px] w-[18px]" />}
                title="Resolved orders"
                value={show(completedOrders + cancelledOrders)}
                detail="Completed or cancelled"
              />
            )}
          </div>

          <section>
            <div className="mb-3">
              <h3 className="text-[14px] font-semibold text-[#253246]">Accounts</h3>
              <p className="mt-0.5 text-[12px] text-[#98A1AE]">People and businesses using Clothify</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                icon={<Users className="h-[18px] w-[18px]" />}
                title="Registered users"
                total={show(users)}
                detail="Customer accounts"
              />
              <StatCard
                icon={<Store className="h-[18px] w-[18px]" />}
                title="Merchants"
                total={show(merchants)}
                detail={pendingMerchants ? pendingMerchants.toLocaleString("en-NG") + " awaiting review" : "No pending merchant reviews"}
              />
              <StatCard
                icon={<Car className="h-[18px] w-[18px]" />}
                title="Riders"
                total={show(riders)}
                detail={pendingRiders ? pendingRiders.toLocaleString("en-NG") + " awaiting review" : "No pending rider reviews"}
              />
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <DonutChart completed={completedOrders} cancelled={cancelledOrders} />
            <section className="rounded-xl border border-[#E7E9EE] bg-white p-5 sm:p-6">
              <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[#172033]">
                Review queue
              </h3>
              <p className="mt-1 text-[12px] text-[#98A1AE]">
                Items that may need action from your team
              </p>
              <dl className="mt-6 divide-y divide-[#F0F1F4]">
                {[
                  ["Merchant approvals", pendingMerchants],
                  ["Rider approvals", pendingRiders],
                  ["Open complaints", openComplaints],
                ].map(([label, amount]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <dt className="text-[13px] text-[#667085]">{label}</dt>
                    <dd className="text-[15px] font-semibold tabular-nums text-[#172033]">
                      {show(Number(amount))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
