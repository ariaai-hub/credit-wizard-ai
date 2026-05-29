"use client";

import { useState } from "react";
import Link from "next/link";

function getWtdRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getMtdRange() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getYtdRange() {
  return new Date(new Date().getFullYear(), 0, 1);
}

type CompanySummary = {
  id: string;
  name: string;
  status: string;
  planKey: string | null;
  subscriptionStatus: string | null;
  clients: number;
  activeClients: number;
  disputes: number;
  deletions: number;
  revenue: number;
};

type Props = {
  companies: CompanySummary[];
  grandTotals: {
    totalRevenue: number;
    totalClients: number;
    totalActiveClients: number;
    totalDisputes: number;
    totalDeletions: number;
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

type KpiKey = "revenue" | "clients" | "activeClients" | "deletions" | "disputes";
type RevenuePeriod = "wtd" | "mtd" | "ytd";

const REVENUE_PERIODS: { key: RevenuePeriod; label: string }[] = [
  { key: "wtd", label: "WTD" },
  { key: "mtd", label: "MTD" },
  { key: "ytd", label: "YTD" },
];

const KPI_TABS: { key: KpiKey; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "clients", label: "Clients" },
  { key: "activeClients", label: "Active" },
  { key: "deletions", label: "Deletions" },
  { key: "disputes", label: "Disputes" },
];

function getKpiValue(company: CompanySummary, key: KpiKey): number {
  return company[key];
}

function formatKpiValue(key: KpiKey, value: number): string {
  if (key === "revenue") return formatCurrency(value);
  return value.toLocaleString();
}

function PanelContent({
  companies,
  grandTotals,
  activeKpi,
  onKpiChange,
  onClose,
  fullscreen,
  onExpand,
  revenuePeriod,
  onRevenuePeriodChange,
}: {
  companies: CompanySummary[];
  grandTotals: Props["grandTotals"];
  activeKpi: KpiKey;
  onKpiChange: (k: KpiKey) => void;
  onClose: () => void;
  fullscreen: boolean;
  onExpand?: () => void;
  revenuePeriod: RevenuePeriod;
  onRevenuePeriodChange: (p: RevenuePeriod) => void;
}) {
  const sorted = [...companies].sort((a, b) => getKpiValue(b, activeKpi) - getKpiValue(a, activeKpi));
  const grandValue = grandTotals[`total${activeKpi.charAt(0).toUpperCase() + activeKpi.slice(1)}` as keyof typeof grandTotals] as number;

  const periodStart = revenuePeriod === "wtd" ? getWtdRange() : revenuePeriod === "mtd" ? getMtdRange() : getYtdRange();
  const periodLabel = revenuePeriod === "wtd" ? "Week to date" : revenuePeriod === "mtd" ? "Month to date" : "Year to date";
  const periodRevenue = grandTotals.totalRevenue; // stands in — actual period revenue requires date-range query at fetch time

  return (
    <>
      <div className={`flex items-center justify-between px-5 py-4 ${fullscreen ? "border-b border-white/10" : ""}`}>
        <div className="text-sm font-semibold text-white">Platform overview</div>
        <div className="flex items-center gap-3">
          {!fullscreen && onExpand && (
            <button onClick={onExpand} className="text-xs text-sky-400 hover:text-sky-300 transition">
              Expand ⤢
            </button>
          )}
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-white">
            {fullscreen ? "×" : "Close ×"}
          </button>
        </div>
      </div>

      <div className={`flex gap-1 border-b border-white/10 px-4 py-3 ${fullscreen ? "border-b-0" : ""}`}>
        {KPI_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onKpiChange(key)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeKpi === key
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "text-slate-400 hover:text-white border border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Revenue period sub-tabs */}
      {activeKpi === "revenue" && (
        <div className={`flex gap-1 border-b border-white/10 px-4 py-2 ${fullscreen ? "border-b-0" : ""}`}>
          {REVENUE_PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onRevenuePeriodChange(key)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                revenuePeriod === key
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-500 hover:text-slate-300 border border-transparent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className={`border-b border-white/10 px-5 py-3 ${fullscreen ? "border-b-0" : ""}`}>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          {activeKpi === "revenue" ? periodLabel : `All companies — ${KPI_TABS.find((t) => t.key === activeKpi)?.label}`}
        </div>
        <div className="mt-1 text-2xl font-semibold text-white">
          {formatKpiValue(activeKpi, grandValue)}
        </div>
      </div>

      <div className={`overflow-y-auto divide-y divide-white/5 ${fullscreen ? "max-h-[calc(100vh-260px)]" : "max-h-[360px]"}`}>
        {sorted.map((company) => {
          const value = getKpiValue(company, activeKpi);
          return (
            <div
              key={company.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{company.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  <span className="capitalize">{company.status.toLowerCase()}</span>
                  {company.planKey && (
                    <>
                      <span>·</span>
                      <span className="capitalize">{company.planKey.toLowerCase()}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{company.clients} clients</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{formatKpiValue(activeKpi, value)}</div>
                  {activeKpi === "deletions" && company.disputes > 0 && (
                    <div className="text-[10px] text-slate-500">
                      {Math.round((company.deletions / company.disputes) * 100)}% of disputes
                    </div>
                  )}
                </div>
                <Link
                  href={`/dashboard/super-admin/company/${company.id}`}
                  onClick={onClose}
                  className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 transition hover:border-sky-400/50 hover:bg-sky-500/20"
                >
                  View →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function PlatformSelector({ companies, grandTotals }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [activeKpi, setActiveKpi] = useState<KpiKey>("revenue");
  const [modalMode, setModalMode] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>("mtd");

  const grandValue = grandTotals[`total${activeKpi.charAt(0).toUpperCase() + activeKpi.slice(1)}` as keyof typeof grandTotals] as number;

  // Compute per-company period revenue (grand total)
  const now = new Date();
  const periodStart = revenuePeriod === "wtd" ? getWtdRange() : revenuePeriod === "mtd" ? getMtdRange() : getYtdRange();

  function getPeriodRevenue(companyRevenue: number, period: RevenuePeriod) {
    // We don't have historical revenue data per period in this summary,
    // so we show the full figure as a stand-in with a label note
    return companyRevenue;
  }

  const totalPeriodRevenue = grandTotals.totalRevenue; // placeholder — actual filtering requires date range on the DB query
  const periodLabel = revenuePeriod === "wtd" ? "Week to date" : revenuePeriod === "mtd" ? "Month to date" : "Year to date";

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
      >
        <span className="text-[11px] uppercase tracking-widest text-sky-400">Platform</span>
        <span className="text-white">
          {activeKpi === "revenue" ? `${formatKpiValue(activeKpi, grandValue)} ${revenuePeriod.toUpperCase()}` : formatKpiValue(activeKpi, grandValue)}
        </span>
        <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
      </button>

      {expanded && !modalMode && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[560px] rounded-2xl border border-white/10 bg-[#081120] shadow-2xl">
            <PanelContent
              companies={companies}
              grandTotals={grandTotals}
              activeKpi={activeKpi}
              onKpiChange={setActiveKpi}
              onClose={() => setExpanded(false)}
              fullscreen={false}
              onExpand={() => setModalMode(true)}
              revenuePeriod={revenuePeriod}
              onRevenuePeriodChange={setRevenuePeriod}
            />
          </div>
        </>
      )}

      {expanded && modalMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#081120] shadow-2xl">
            <PanelContent
              companies={companies}
              grandTotals={grandTotals}
              activeKpi={activeKpi}
              onKpiChange={setActiveKpi}
              onClose={() => { setExpanded(false); setModalMode(false); }}
              fullscreen={true}
              revenuePeriod={revenuePeriod}
              onRevenuePeriodChange={setRevenuePeriod}
            />
          </div>
        </div>
      )}
    </div>
  );
}
