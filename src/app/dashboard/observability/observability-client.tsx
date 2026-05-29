"use client";

import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Period = 7 | 14 | 30;

type MessageDay = { date: string; count: number };
type RatingBucket = { rating: number; count: number };
type ConversationRow = {
  clientId: string;
  clientName: string;
  messageCount: number;
  avgRating: number | null;
  hasEscalation: boolean;
  lastMessage: Date;
};

type Stats = {
  totalMessages: number;
  avgRating: number | null;
  escalationRate: number;
  activeClients: number;
  dailyData: MessageDay[];
  ratingDist: RatingBucket[];
  conversations: ConversationRow[];
};

// ─── Star formatting ──────────────────────────────────────────────────────────
function formatStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
}

// ─── Relative time ────────────────────────────────────────────────────────────
function formatRelativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Volume chart tooltip ─────────────────────────────────────────────────────
function VolumeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1e35] px-3 py-2 text-sm text-white shadow-xl">
      <div className="text-slate-300">{label}</div>
      <div className="font-semibold">{payload[0].value} messages</div>
    </div>
  );
}

// ─── Rating chart tooltip ─────────────────────────────────────────────────────
function RatingTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1e35] px-3 py-2 text-sm text-white shadow-xl">
      <div className="text-slate-300">Rating {label}</div>
      <div className="font-semibold">{payload[0].value} messages</div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <div className="public-surface rounded-2xl p-6">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200/70">{label}</div>
      <div className="mt-3 text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{sub}</div>
    </div>
  );
}

// ─── Chart card shell ─────────────────────────────────────────────────────────
function ChartCard({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="public-surface p-6 md:p-8">
      <div className="lux-label">{label}</div>
      <h2 className="mt-3 text-xl font-semibold text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────
export function ObservabilityClient({ stats, period }: { stats: Stats; period: Period }) {
  const totalRatings = stats.ratingDist.reduce((s, r) => s + r.count, 0);

  const ratingFill = (rating: number) => {
    if (rating >= 4) return "#34d399";
    if (rating === 3) return "#fbbf24";
    return "#fb7185";
  };

  return (
    <>
      {/* Header */}
      <header className="public-surface flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-start md:p-10">
        <div>
          <div className="lux-label">Bot performance</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">
            AI Quality Dashboard
          </h1>
          <p className="mt-2 text-base text-slate-300">
            Monitor bot response quality, escalation rates, and client satisfaction.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {([7, 14, 30] as Period[]).map((p) => (
            <Link
              key={p}
              href={`/dashboard/observability?days=${p}`}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                period === p
                  ? "border-sky-500/50 bg-sky-500/10 text-sky-300"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {p}d
            </Link>
          ))}
        </div>
      </header>

      {/* Stats row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total messages"
          value={stats.totalMessages.toLocaleString()}
          sub={`last ${period} days`}
        />
        <StatCard
          label="Avg rating"
          value={stats.avgRating !== null ? `★ ${stats.avgRating}` : "—"}
          sub={
            stats.avgRating !== null
              ? `from ${totalRatings} rated`
              : "no ratings yet"
          }
        />
        <StatCard
          label="Escalation rate"
          value={`${stats.escalationRate}%`}
          sub={
            stats.escalationRate < 10
              ? "healthy"
              : stats.escalationRate < 20
              ? "elevated"
              : "review needed"
          }
        />
        <StatCard
          label="Active clients"
          value={stats.activeClients.toLocaleString()}
          sub={`with messages in ${period}d`}
        />
      </section>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard label="Daily volume" title="Messages over time">
          {stats.dailyData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-slate-500 text-sm">
              No message activity in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={stats.dailyData}
                margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#1e293b" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<VolumeTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fill="url(#volGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#0ea5e9" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard label="Rating distribution" title="Client satisfaction">
          {totalRatings === 0 ? (
            <div className="flex h-48 items-center justify-center text-slate-500 text-sm">
              No ratings yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[1, 2, 3, 4, 5].map((r) => ({
                  rating: r,
                  count: stats.ratingDist.find((d) => d.rating === r)?.count ?? 0,
                }))}
                margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="rating"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#1e293b" }}
                  tickFormatter={(v: number) => `★${v}`}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<RatingTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <Bar key={r} fill={ratingFill(r)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Conversation list */}
      <section className="public-surface p-6 md:p-8">
        <div className="lux-label">Recent conversations</div>
        <h2 className="mt-3 text-xl font-semibold text-white">
          Top clients by message volume
        </h2>

        {stats.conversations.length === 0 ? (
          <div className="mt-6 text-slate-500 text-sm">
            No conversations in this period.
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 text-right font-medium">Messages</th>
                  <th className="px-4 py-3 text-right font-medium">Avg rating</th>
                  <th className="px-4 py-3 text-right font-medium">Escalation</th>
                  <th className="px-4 py-3 text-right font-medium">Last message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.conversations.map((row) => (
                  <tr
                    key={row.clientId}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4 text-slate-200 font-medium">
                      {row.clientName}
                    </td>
                    <td className="px-4 py-4 text-right text-white">
                      {row.messageCount}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {row.avgRating !== null ? (
                        <span className="text-amber-400 font-medium">
                          {formatStars(row.avgRating)}
                        </span>
                      ) : (
                        <span className="text-slate-500">No rating</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {row.hasEscalation ? (
                        <span className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded-full">
                          Escalated
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-400">
                      {formatRelativeTime(row.lastMessage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}