"use client";

import * as React from "react";

export default function UserTabs({
  active,
  counts,
  onChange,
}: {
  active: "all" | "new";
  counts: { all: number; new: number };
  onChange: (tab: "all" | "new") => void;
}) {
  return (
    <div className="flex gap-6 overflow-x-auto border-b border-[#E7E9EE]" role="tablist" aria-label="User status">
      {[
        { id: "all" as const, label: "All users", count: counts.all },
        { id: "new" as const, label: "New users", count: counts.new },
      ].map((item) => {
        const selected = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={
              "relative shrink-0 px-1 py-3 text-[13px] font-medium transition-colors " +
              (selected ? "text-[#172033]" : "text-[#8993A2] hover:text-[#475467]")
            }
          >
            {item.label}
            <span className="ml-1 text-[#A0A7B3]">({item.count})</span>
            {selected && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 rounded-t bg-[#071D59]" />}
          </button>
        );
      })}
    </div>
  );
}
