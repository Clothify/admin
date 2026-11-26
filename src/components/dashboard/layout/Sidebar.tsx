"use client";

import * as React from "react";
import Image from "next/image";

type NavItem = { name: string; icon: React.ReactNode };

const GROUPS = [
  { label: "Workspace", names: ["Overview"] },
  { label: "Operations", names: ["Users", "Merchants", "Riders", "Orders", "Order diagnostics"] },
  { label: "Finance", names: ["Revenue & Finance", "Withdrawals", "Pricing", "Referrals"] },
  { label: "Engagement", names: ["Notifications", "Support"] },
  { label: "Administration", names: ["Admin Team", "Audit Log"] },
];

export default function Sidebar({
  items,
  active,
  onSelect,
}: {
  items: NavItem[];
  active: string;
  onSelect: (name: string) => void;
}) {
  return (
    <aside
      className="sticky top-0 hidden h-dvh w-[246px] shrink-0 flex-col border-r border-[#E7E9EE] bg-white lg:flex"
      aria-label="Primary navigation"
    >
      <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-[#F0F1F4] px-6">
        <Image src="/logo.png" alt="" width={36} height={36} className="shrink-0 object-contain" />
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-[-0.025em] text-[#172033]">Clothify</div>
          <div className="mt-0.5 text-[11px] font-medium text-[#8A92A0]">ADMIN WORKSPACE</div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3.5 py-5">
        {GROUPS.map((group) => {
          const entries = group.names
            .map((name) => items.find((item) => item.name === name))
            .filter((item): item is NavItem => Boolean(item));
          if (!entries.length) return null;

          return (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#98A1AE]">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {entries.map((item) => {
                  const selected = active === item.name;
                  return (
                    <li key={item.name}>
                      <button
                        type="button"
                        onClick={() => onSelect(item.name)}
                        aria-current={selected ? "page" : undefined}
                        className={
                          "relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition-colors " +
                          (selected
                            ? "bg-[#EEF1F5] text-[#152644]"
                            : "text-[#667085] hover:bg-[#F7F8FA] hover:text-[#263244]")
                        }
                      >
                        {selected && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#071D59]" />}
                        <span aria-hidden="true" className={selected ? "text-[#071D59]" : "text-[#8993A2]"}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[#F0F1F4] px-6 py-4">
        <p className="text-xs font-medium text-[#3A4656]">Clothify operations</p>
        <p className="mt-0.5 text-[11px] text-[#98A1AE]">Internal use only</p>
      </div>
    </aside>
  );
}
