"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

type AffiliateStats = {
  referralCode: string | null;
  referralCount: number;
  totalEarnings: number;
  pendingBalance: number;
  paidOut: number;
  referrals: {
    referredName: string;
    referredEmail: string | null;
    joinedAt: Date | string;
    status: string;
    commission: number;
    plan: string | null;
  }[];
  plan: string | null;
};

type Props = {
  stats: AffiliateStats;
  referralLink: string | null;
  payoutThresholdCents: number;
  canRequestPayout: boolean;
};

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  ELITE: "Elite",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "text-amber-400" },
  PAID: { label: "Paid out", color: "text-emerald-400" },
  CANCELLED: { label: "Cancelled", color: "text-rose-400" },
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function groupByMonth(referrals: AffiliateStats["referrals"]) {
  const groups: Record<string, number> = {};
  for (const r of referrals) {
    const d = new Date(r.joinedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    groups[key] = (groups[key] ?? 0) + r.commission;
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([month, amount]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      amount,
    }));
}

export function AffiliateDashboardClient({ stats, referralLink, payoutThresholdCents, canRequestPayout }: Props) {
  const [copied, setCopied] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleCopy() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text
    }
  }

  async function handleRequestPayout() {
    if (!canRequestPayout) return;
    setPayoutLoading(true);
    setPayoutMsg(null);

    // For now, open support contact. Real implementation would call a payout API.
    // Marking as paid is an admin operation handled by POST /api/admin/affiliate/payout
    // The frontend shows the button and indicates when threshold is met.
    window.location.href = `mailto:support@creditwizard.ai?subject=Affiliate+Payout+Request&body=I+would+like+to+request+a+payout+of+${formatCurrency(stats.pendingBalance)}.`;
  }

  const monthlyData = groupByMonth(stats.referrals);
  const maxMonthly = Math.max(...monthlyData.map((m) => m.amount), 1);

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Header */}
        <header className="public-surface p-8 md:p-10">
          <div className="lux-label">Affiliate Program</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
            Earn commission referring businesses
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
            Share Credit Wizard with other credit repair companies. Earn up to 30% recurring commission on every plan you refer — for as long as they stay a customer.
          </p>
        </header>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Earned"
            value={formatCurrency(stats.totalEarnings)}
            valueColor="text-emerald-400"
            sub={`${stats.referralCount} referral${stats.referralCount !== 1 ? "s" : ""}`}
          />
          <StatCard
            label="Pending"
            value={formatCurrency(stats.pendingBalance)}
            valueColor="text-amber-400"
            sub={`Min. payout: ${formatCurrency(payoutThresholdCents)}`}
          />
          <StatCard
            label="Paid Out"
            value={formatCurrency(stats.paidOut)}
            valueColor="text-white"
            sub="All time"
          />
          <StatCard
            label="Active Referrals"
            value={String(stats.referralCount)}
            valueColor="text-white"
            sub="Completed signups"
          />
        </div>

        {/* Referral link */}
        <section className="public-surface p-6 md:p-8">
          <div className="lux-label">Your referral link</div>
          <p className="mt-2 text-sm text-slate-300">
            Share this link with credit repair companies. When they subscribe to Pro or Elite, you earn commission automatically.
          </p>

          {referralLink ? (
            <div className="mt-5 flex gap-3">
              <input
                readOnly
                value={referralLink}
                className="public-input min-w-0 flex-1 px-4 py-3 text-sm text-slate-200"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-2xl border border-sky-500/30 bg-sky-500/15 px-5 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/25 active:scale-95"
              >
                {copied ? "✓ Copied" : "Copy link"}
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
              No referral code found for your account. Contact support to get one set up.
            </div>
          )}

          {/* Commission rates */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="public-surface-soft flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-semibold text-white">Pro Referrals</div>
                <div className="mt-1 text-xs text-slate-400">20% of $59.99/mo = $11.99/mo per referral</div>
              </div>
              <div className="text-xl font-bold text-emerald-400">20%</div>
            </div>
            <div className="public-surface-soft flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-semibold text-white">Elite Referrals</div>
                <div className="mt-1 text-xs text-slate-400">30% of $129.99/mo = $38.99/mo per referral</div>
              </div>
              <div className="text-xl font-bold text-emerald-400">30%</div>
            </div>
          </div>
        </section>

        {/* Monthly commission breakdown */}
        {monthlyData.length > 0 && (
          <section className="public-surface p-6 md:p-8">
            <div className="lux-label">Commission by month</div>
            <h2 className="mt-3 text-xl font-semibold text-white">Earnings over time</h2>

            <div className="mt-6 space-y-3">
              {monthlyData.map(({ month, amount }) => {
                const pct = Math.min(100, Math.round((amount / maxMonthly) * 100));
                return (
                  <div key={month} className="grid grid-cols-[120px_1fr_80px] items-center gap-4">
                    <div className="text-sm text-slate-400">{month}</div>
                    <div className="h-6 min-w-0 rounded-full bg-sky-500/20">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500/60 to-emerald-400/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-right text-sm font-semibold text-emerald-400">
                      {formatCurrency(amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Referrals table */}
        <section className="public-surface p-6 md:p-8">
          <div className="lux-label">Your referrals</div>
          <h2 className="mt-3 text-xl font-semibold text-white">Referral history</h2>

          {stats.referrals.length === 0 ? (
            <div className="mt-8 text-center">
              <div className="text-5xl text-slate-600">🔗</div>
              <p className="mt-4 text-slate-400">No referrals yet. Share your link above to get started!</p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Plan</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Joined</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {stats.referrals.map((r) => {
                    const status = STATUS_LABELS[r.status] ?? { label: r.status, color: "text-slate-400" };
                    return (
                      <tr key={r.referredEmail ?? r.referredName} className="public-surface-soft last:border-0">
                        <td className="py-3 pr-4">
                          <div className="font-medium text-white">{r.referredName}</div>
                          {r.referredEmail && (
                            <div className="text-xs text-slate-500">{r.referredEmail}</div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {PLAN_LABELS[r.plan ?? ""] ?? r.plan ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-slate-400">{formatDate(r.joinedAt)}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="font-semibold text-emerald-400">{formatCurrency(r.commission)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Payout */}
        <section className="public-surface p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="lux-label">Payout</div>
              <h2 className="mt-3 text-xl font-semibold text-white">Request a payout</h2>
              <p className="mt-2 text-sm text-slate-300">
                Payouts are processed manually. Minimum balance:{" "}
                <span className="font-semibold text-white">{formatCurrency(payoutThresholdCents)}</span>.
                Current balance:{" "}
                <span className={`font-semibold ${stats.pendingBalance >= payoutThresholdCents ? "text-emerald-400" : "text-amber-400"}`}>
                  {formatCurrency(stats.pendingBalance)}
                </span>
              </p>
            </div>
            <div className="shrink-0">
              <button
                onClick={handleRequestPayout}
                disabled={!canRequestPayout || payoutLoading}
                className={`rounded-2xl px-8 py-3.5 text-sm font-semibold transition ${
                  canRequestPayout
                    ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 active:scale-95"
                    : "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
                }`}
              >
                {payoutLoading ? "Opening email..." : canRequestPayout ? "Request Payout" : `Need ${formatCurrency(payoutThresholdCents - stats.pendingBalance)} more`}
              </button>
            </div>
          </div>
          {payoutMsg && (
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              payoutMsg.type === "success"
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border border-rose-500/30 bg-rose-500/10 text-rose-200"
            }`}>
              {payoutMsg.text}
            </div>
          )}
        </section>

        {/* FAQ */}
        <section className="public-surface p-6 md:p-8">
          <div className="lux-label">FAQ</div>
          <h2 className="mt-3 text-xl font-semibold text-white">How does the affiliate program work?</h2>
          <div className="mt-6 space-y-5">
            <FaqItem q="How do I get paid?" a="When your referral pays their first subscription invoice, commission is automatically credited to your account as pending. Request a payout once you hit the $50 minimum." />
            <FaqItem q="How much commission do I earn?" a="You earn 20% for Pro referrals ($11.99/mo per customer) and 30% for Elite referrals ($38.99/mo per customer), recurring for as long as they stay subscribed." />
            <FaqItem q="How long do I earn commission?" a="You earn commission for as long as your referral remains an active paying customer. If they cancel, commission stops after their final paid month." />
            <FaqItem q="How are payouts sent?" a="Payouts are sent via bank transfer or Stripe payout. Request a payout from this page once your pending balance reaches $50." />
            <FaqItem q="Do Starter plan users earn commission?" a="No — only Pro and Elite plans qualify for the affiliate program. Share Credit Wizard with businesses that need advanced features." />
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, valueColor, sub }: { label: string; value: string; valueColor: string; sub: string }) {
  return (
    <div className="public-surface p-6">
      <div className="lux-label">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="public-surface-soft p-4">
      <div className="font-semibold text-white">{q}</div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{a}</p>
    </div>
  );
}
