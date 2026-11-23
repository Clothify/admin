"use client";

import * as React from "react";
import type { StatCardProps } from "@/types/dashboard";

export default function StatCard({ icon, title, total, detail }: StatCardProps) {
  return (
    <article className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-[#E7E9EE] bg-white px-5 py-5">
      <div className="min-w-0">
        <h3 className="text-[13px] font-medium text-[#667085]">{title}</h3>
        <p className="mt-2 text-[25px] font-semibold leading-tight tracking-[-0.04em] text-[#172033]">
          {total}
        </p>
        {detail && <p className="mt-2 text-[12px] text-[#98A1AE]">{detail}</p>}
      </div>
      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F3F5F7] text-[#64748B]">
        {icon}
      </span>
    </article>
  );
}
