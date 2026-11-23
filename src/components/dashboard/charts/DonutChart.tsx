"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function DonutChart({
  completed,
  cancelled,
}: {
  completed: number;
  cancelled: number;
}) {
  const total = completed + cancelled;
  const hasData = total > 0;
  const donut = [
    { name: "Completed", raw: completed, value: hasData ? completed / total * 100 : 0, color: "#071D59" },
    { name: "Cancelled", raw: cancelled, value: hasData ? cancelled / total * 100 : 0, color: "#D48D78" },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-lg border border-[#E7E9EE] bg-white px-3 py-2 text-xs shadow-sm">
        <p className="font-semibold text-[#172033]">{item.name}</p>
        <p className="mt-1 text-[#667085]">{item.raw.toLocaleString()} orders · {Math.round(item.value)}%</p>
      </div>
    );
  };

  return (
    <section className="rounded-xl border border-[#E7E9EE] bg-white p-5 sm:p-6">
      <div>
        <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[#172033]">Order outcomes</h3>
        <p className="mt-1 text-[12px] text-[#98A1AE]">Completed and cancelled orders recorded so far</p>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:gap-8">
        <div className="relative h-[200px] w-[220px] shrink-0">
          {hasData ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donut}
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={-270}
                    outerRadius={85}
                    innerRadius={64}
                    dataKey="value"
                    stroke="none"
                  >
                    {donut.map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[23px] font-semibold tracking-[-0.04em] text-[#172033]">{total.toLocaleString()}</span>
                <span className="text-[11px] text-[#98A1AE]">Resolved</span>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-lg bg-[#F7F8FA] text-center text-xs text-[#98A1AE]">
              No resolved orders yet
            </div>
          )}
        </div>

        <div className="w-full min-w-0 flex-1 space-y-3">
          {donut.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4 border-b border-[#F0F1F4] pb-3 last:border-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: item.color }} />
                <span className="text-[13px] font-medium text-[#475467]">{item.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="text-[13px] font-semibold tabular-nums text-[#172033]">{item.raw.toLocaleString()}</span>
                <span className="w-10 text-right text-[12px] tabular-nums text-[#98A1AE]">{Math.round(item.value)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
