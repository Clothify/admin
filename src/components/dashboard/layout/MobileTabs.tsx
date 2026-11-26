"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

type NavItem = { name: string; icon: React.ReactNode };

const GROUPS = [
  { label: "Workspace", names: ["Overview"] },
  { label: "Operations", names: ["Users", "Merchants", "Riders", "Orders", "Order diagnostics"] },
  { label: "Finance", names: ["Revenue & Finance", "Withdrawals", "Pricing", "Referrals"] },
  { label: "Engagement", names: ["Notifications", "Support"] },
  { label: "Administration", names: ["Admin Team", "Audit Log"] },
];

export default function MobileTabs({
  items,
  active,
  onSelect,
}: {
  items: NavItem[];
  active: string;
  onSelect: (name: string) => void;
}) {
  return (
    <nav
      className="sticky top-[76px] z-20 flex items-center justify-between gap-4 border-b border-[#E7E9EE] bg-white px-4 py-3 sm:px-6 lg:hidden"
      aria-label="Admin sections"
    >
      <span className="shrink-0 text-xs font-medium text-[#667085]">Go to section</span>
      <div className="relative min-w-0 max-w-[230px] flex-1">
        <select
          aria-label="Choose admin section"
          value={active}
          onChange={(event) => onSelect(event.target.value)}
          className="h-10 w-full appearance-none truncate rounded-lg border border-[#E1E5EA] bg-[#FAFBFC] py-2 pl-3 pr-9 text-[13px] font-medium text-[#172033]"
        >
          {GROUPS.map((group) => {
            const entries = group.names.filter((name) =>
              items.some((item) => item.name === name),
            );
            return entries.length ? (
              <optgroup key={group.label} label={group.label}>
                {entries.map((name) => <option key={name} value={name}>{name}</option>)}
              </optgroup>
            ) : null;
          })}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
      </div>
    </nav>
  );
}
