"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  page,
  totalPages,
  onChange,
  className = "",
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  className?: string;
}) {
  const windowSize = 5;
  const build = () => {
    if (totalPages <= windowSize) return Array.from({ length: totalPages }, (_, index) => index + 1);
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    let end = start + windowSize - 1;
    if (end > totalPages) {
      end = totalPages;
      start = totalPages - windowSize + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };
  const pages = build();

  const pageButton = (number: number) => (
    <button
      type="button"
      key={number}
      onClick={() => onChange(number)}
      aria-label={"Go to page " + number}
      aria-current={number === page ? "page" : undefined}
      className={
        "grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-[12px] font-medium transition-colors " +
        (number === page
          ? "border-[#D4DCE7] bg-[#EEF1F5] text-[#071D59]"
          : "border-transparent text-[#667085] hover:border-[#E7E9EE] hover:bg-[#F7F8FA]")
      }
    >
      {number}
    </button>
  );

  return (
    <nav className={"flex items-center gap-1 " + className} aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-[#E7E9EE] bg-white text-[#667085] hover:bg-[#F7F8FA] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
        disabled={page <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {totalPages > windowSize && pages[0] > 1 && pageButton(1)}
      {totalPages > windowSize && pages[0] > 2 && <span className="px-1 text-xs text-[#98A1AE]">…</span>}
      {pages.map(pageButton)}
      {totalPages > windowSize && pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-xs text-[#98A1AE]">…</span>}
      {totalPages > windowSize && pages[pages.length - 1] < totalPages && pageButton(totalPages)}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-[#E7E9EE] bg-white text-[#667085] hover:bg-[#F7F8FA] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
        disabled={page >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
