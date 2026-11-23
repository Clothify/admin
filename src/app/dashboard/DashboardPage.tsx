"use client";
import * as React from "react";
import {
  Home,
  Users,
  Store,
  Car,
  DollarSign,
  ShoppingCart,
  UserCheck,
  Bell,
  LifeBuoy,
  Landmark,
  ArrowDownToLine,
  ShieldCheck,
  ScrollText,
  LogOut,
} from "lucide-react";

import Sidebar from "@/components/dashboard/layout/Sidebar";
import MobileTabs from "@/components/dashboard/layout/MobileTabs";
import { PageLoadingState } from "@/components/dashboard/ui/LoadingState";
import AdminNotificationBell from "@/components/dashboard/AdminNotificationBell";

import HomeTab from "./tabs/HomeTab";
import UserManagementTab from "./tabs/UserManagementTab";
import MerchantManagementTab from "./tabs/MerchantManagementTab";
import RiderManagementTab from "./tabs/RiderManagementTab";
import PriceManagementTab from "./tabs/PriceManagementTab";
import OrderManagementTab from "./tabs/OrderManagementTab";
import ReferralTab from "./tabs/ReferralTab";
import SendNotificationsTab from "./tabs/SendNotificationsTab";
import SupportTab from "./tabs/SupportTab";
import FinanceTab from "./tabs/FinanceTab";
import WithdrawalsTab from "./tabs/WithdrawalsTab";
import AdminTeamTab from "./tabs/AdminTeamTab";
import AuditLogTab from "./tabs/AuditLogTab";
import {
  AdminContext,
  clearSession,
  getAdminContext,
  getAuthUser,
  requireAdminSession,
} from "@/lib/api";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  {
    slug: "overview",
    name: "Overview",
    permission: "dashboard.read",
    icon: <Home className="w-4 h-4" />,
    component: HomeTab,
  },
  {
    slug: "finance",
    name: "Revenue & Finance",
    permission: "finance.read",
    icon: <Landmark className="w-4 h-4" />,
    component: FinanceTab,
  },
  {
    slug: "withdrawals",
    name: "Withdrawals",
    permission: "withdrawals.read",
    icon: <ArrowDownToLine className="w-4 h-4" />,
    component: WithdrawalsTab,
  },
  {
    slug: "users",
    name: "Users",
    permission: "users.read",
    icon: <Users className="w-4 h-4" />,
    component: UserManagementTab,
  },
  {
    slug: "merchants",
    name: "Merchants",
    permission: "merchants.read",
    icon: <Store className="w-4 h-4" />,
    component: MerchantManagementTab,
  },
  {
    slug: "riders",
    name: "Riders",
    permission: "riders.read",
    icon: <Car className="w-4 h-4" />,
    component: RiderManagementTab,
  },
  {
    slug: "orders",
    name: "Orders",
    permission: "orders.read",
    icon: <ShoppingCart className="w-4 h-4" />,
    component: OrderManagementTab,
  },
  {
    slug: "pricing",
    name: "Pricing",
    permission: "pricing.read",
    icon: <DollarSign className="w-4 h-4" />,
    component: PriceManagementTab,
  },
  {
    slug: "referrals",
    name: "Referrals",
    permission: "referrals.read",
    icon: <UserCheck className="w-4 h-4" />,
    component: ReferralTab,
  },
  {
    slug: "notifications",
    name: "Notifications",
    permission: "notifications.read",
    icon: <Bell className="w-4 h-4" />,
    component: SendNotificationsTab,
  },
  {
    slug: "support",
    name: "Support",
    permission: "support.read",
    icon: <LifeBuoy className="w-4 h-4" />,
    component: SupportTab,
  },
  {
    slug: "admin-team",
    name: "Admin Team",
    permission: "admins.manage",
    icon: <ShieldCheck className="w-4 h-4" />,
    component: AdminTeamTab,
  },
  {
    slug: "audit-log",
    name: "Audit Log",
    permission: "audit.read",
    icon: <ScrollText className="w-4 h-4" />,
    component: AuditLogTab,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = React.useState(false);
  const [admin, setAdmin] = React.useState<AdminContext | null>(null);
  const [accessError, setAccessError] = React.useState<string | null>(null);
  const user = getAuthUser();

  React.useEffect(() => {
    if (!requireAdminSession()) {
      router.replace("/auth/signin");
      return;
    }
    getAdminContext()
      .then((context) => {
        setAdmin(context);
        setChecked(true);
      })
      .catch((error) => {
        setAccessError(
          error?.message || "Unable to load administrator permissions",
        );
        setChecked(true);
      });
  }, [router]);

  const visibleTabs = TABS.filter((tab) =>
    admin?.permissions.includes(tab.permission),
  );
  const activeSlug = pathname.split("/").filter(Boolean).at(-1) || "overview";
  const activeTab =
    visibleTabs.find((tab) => tab.slug === activeSlug) || visibleTabs[0];
  const ActiveView = activeTab?.component;

  if (!checked) {
    return <PageLoadingState label="Checking administrator session" />;
  }

  if (accessError || !admin || !ActiveView) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] grid place-items-center px-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center">
          <h1 className="font-semibold text-slate-950">
            Admin access unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {accessError ||
              "This account has no assigned administrative capabilities."}
          </p>
          <button
            onClick={() => {
              clearSession();
              router.replace("/auth/signin");
            }}
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Return to sign in
          </button>
        </div>
      </div>
    );
  }

  const goToTab = (name: string) => {
    const next = visibleTabs.find((tab) => tab.name === name);
    if (next) router.push("/dashboard/" + next.slug);
  };
  const sectionGroup =
    ["users", "merchants", "riders", "orders"].includes(activeTab.slug) ? "Operations" :
    ["finance", "withdrawals", "pricing", "referrals"].includes(activeTab.slug) ? "Finance" :
    ["notifications", "support"].includes(activeTab.slug) ? "Engagement" :
    ["admin-team", "audit-log"].includes(activeTab.slug) ? "Administration" : "Workspace";
  const adminName = String(admin.displayName || user?.email || user?.phone || "Administrator");

  return (
    <div className="dashboard-app min-h-dvh bg-[#F6F7F9] lg:grid lg:grid-cols-[246px_minmax(0,1fr)]">
      <Sidebar
        items={visibleTabs.map(({ name, icon }) => ({ name, icon }))}
        active={activeTab.name}
        onSelect={goToTab}
      />

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[#E7E9EE] bg-white/95 backdrop-blur-sm">
          <div className="flex h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium tracking-[0.025em] text-[#8993A2]">
                Clothify <span className="mx-1.5 text-[#C7CDD6]">/</span> {sectionGroup}
              </p>
              <h1 className="mt-1 truncate text-[19px] font-semibold tracking-[-0.03em] text-[#172033] sm:text-[21px]">
                {activeTab.name}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <AdminNotificationBell />
              <div className="hidden h-7 w-px bg-[#E9EBEF] sm:block" aria-hidden="true" />
              <div className="hidden max-w-[190px] text-right sm:block">
                <p className="truncate text-[12px] font-semibold text-[#344054]">{adminName}</p>
                <p className="text-[11px] text-[#98A1AE]">Administrator</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  router.push("/auth/signin");
                }}
                aria-label="Sign out of Clothify admin"
                title="Sign out"
                className="grid h-9 w-9 place-items-center rounded-lg border border-[#E7E9EE] bg-white text-[#667085] transition-colors hover:bg-[#F6F7F9] hover:text-[#172033]"
              >
                <LogOut className="h-[17px] w-[17px]" />
              </button>
            </div>
          </div>
        </header>

        <MobileTabs
          items={visibleTabs.map(({ name, icon }) => ({ name, icon }))}
          active={activeTab.name}
          onSelect={goToTab}
        />

        <main id="main-content" className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          {activeTab.slug === "overview" ? (
            <HomeTab permissions={admin.permissions} />
          ) : activeTab.slug === "withdrawals" ? (
            <WithdrawalsTab permissions={admin.permissions} />
          ) : activeTab.slug === "riders" ? (
            <RiderManagementTab permissions={admin.permissions} />
          ) : activeTab.slug === "orders" ? (
            <OrderManagementTab permissions={admin.permissions} />
          ) : (
            <ActiveView />
          )}
        </main>
      </div>
    </div>
  );
}
