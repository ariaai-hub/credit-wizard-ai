"use client";

import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  activeTab: string;
  q: string;
  type: string;
  from: string;
  to: string;
};

export function MailQueueFilters({ activeTab, q, type, from, to }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const baseHref = activeTab === "sent" ? "/dashboard/mail?tab=sent" : "/dashboard/mail";

  function updateParams(params: Record<string, string>) {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    });
    startTransition(() => {
      router.push(url.pathname + url.search);
    });
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-opacity ${isPending ? "opacity-60" : "opacity-100"}`}>
      {/* Search */}
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-slate-500 shrink-0">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search client or tracking #..."
          defaultValue={q}
          onChange={(e) => updateParams({ q: e.target.value, type, from, to })}
          className="w-52 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
        />
      </div>

      {/* Mail type filter */}
      <select
        value={type}
        onChange={(e) => updateParams({ q, type: e.target.value, from, to })}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
      >
        <option value="all">All types</option>
        <option value="CERTIFIED">✦ Certified</option>
        <option value="REGULAR">Standard</option>
      </select>

      {/* Date range */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>From</span>
        <input
          type="date"
          value={from}
          onChange={(e) => updateParams({ q, type, from: e.target.value, to })}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
        />
        <span>to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => updateParams({ q, type, from, to: e.target.value })}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
        />
      </div>

      {/* Clear */}
      {(q || type !== "all" || from || to) && (
        <button
          onClick={() => router.push(baseHref)}
          className="ml-auto rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-white/20 hover:text-white"
        >
          Clear filters ×
        </button>
      )}
    </div>
  );
}
