"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { MetricCardProps } from "@/types/dashboard";

export default function MetricCard({
  icon,
  title,
  value,
  detail,
  change,
  isPositive = true,
}: MetricCardProps) {
  return (
    <article className="min-w-0 rounded-xl border border-[#E7E9EE] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="pt-0.5 text-[13px] font-medium text-[#667085]">{title}</h3>
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F3F5F7] text-[#53627A]">
          {icon}
        </span>
      </div>
      <p className="mt-2 break-words text-[27px] font-semibold leading-tight tracking-[-0.045em] text-[#172033]">
        {value}
      </p>
      <div className="mt-3 flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1">
        {change && (
          <span className={"inline-flex items-center gap-0.5 text-xs font-semibold " +
            (isPositive ? "text-[#21815D]" : "text-[#B54747]")}>
            {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {change}
          </span>
        )}
        {detail && <p className="text-[12px] text-[#98A1AE]">{detail}</p>}
      </div>
    </article>
  );
}
