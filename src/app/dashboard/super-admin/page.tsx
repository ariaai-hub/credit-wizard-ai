import { requireSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { getStripe } from "@/lib/stripe";
import Link from "next/link";

async function getOverviewData() {
  const [tenants, clients, disputes, commissions] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        subscriptions: {
          where: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE", "GRACE"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.client.findMany({
      select: { id: true, tenantId: true, onboardingCompletedAt: true },
    }),
    prisma.disputeTradelineRecord.findMany({
      select: { id: true, status: true, responseClass: true, disputeCase: { select: { tenantId: true } } },
    }),
    prisma.referralCommission.findMany({
      include: {
        referrerTenant: { select: { name: true, plan: true } },
        referredTenant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Fetch Stripe revenue for each tenant in parallel
  const stripe = getStripe();
  const tenantRevenue = await Promise.all(
    tenants.map(async (t) => {
      const sub = t.subscriptions[0];
      if (!sub?.providerSubscriptionId) return { tenantId: t.id, revenue: 0 };
      try {
        const subData = await stripe.subscriptions.retrieve(sub.providerSubscriptionId);
        const amount = (subData.items.data[0]?.price.unit_amount || 0) / 100;
        return { tenantId: t.id, revenue: amount };
      } catch {
        return { tenantId: t.id, revenue: 0 };
      }
    })
  );
  const revenueMap = Object.fromEntries(tenantRevenue.map((r) => [r.tenantId, r.revenue]));

  // Build per-tenant stats
  const companies = tenants.map((t) => {
    const c = clients.filter((c) => c.tenantId === t.id);
    const d = disputes.filter((d) => d.disputeCase?.tenantId === t.id);
    const sub = t.subscriptions[0];
    return {
      id: t.id,
      name: t.name || "Unnamed",
      status: t.status,
      subscriptionStatus: sub?.status ?? null,
      planKey: sub?.planKey ?? null,
      clients: c.length,
      activeClients: c.filter((x) => x.onboardingCompletedAt).length,
      disputes: d.length,
      deletions: d.filter((x) => x.responseClass === "deleted").length,
      revenue: revenueMap[t.id] ?? 0,
    };
  });

  const grandTotals = {
    totalRevenue: companies.reduce((s, c) => s + c.revenue, 0),
    totalClients: companies.reduce((s, c) => s + c.clients, 0),
    totalActiveClients: companies.reduce((s, c) => s + c.activeClients, 0),
    totalDisputes: companies.reduce((s, c) => s + c.disputes, 0),
    totalDeletions: companies.reduce((s, c) => s + c.deletions, 0),
  };

  // Affiliate commission summary
  const affiliateSummary = {
    totalCommissions: commissions.reduce((s, c) => s + c.amount, 0),
    pendingCommissions: commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.amount, 0),
    paidCommissions: commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amount, 0),
    topAffiliates: Object.entries(
      commissions.reduce<Record<string, { name: string; plan: string; total: number }>>((acc, comm) => {
        const key = comm.referrerTenantId;
        if (!acc[key]) acc[key] = { name: comm.referrerTenant.name || "Unknown", plan: comm.referrerTenant.plan || "", total: 0 };
        acc[key].total += comm.amount;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([id, data]) => ({ id, ...data })),
  };

  return { companies, grandTotals, affiliateSummary };
}

export default async function SuperAdminPage() {
  const session = await requireSession();
  if (!isSuperAdmin(session.email)) redirect("/dashboard");

  const { companies, grandTotals, affiliateSummary } = await getOverviewData();
  const grandDeletionRate =
    grandTotals.totalDisputes > 0
      ? Math.round((grandTotals.totalDeletions / grandTotals.totalDisputes) * 100)
      : 0;

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

        {/* Header */}
        <header className="public-surface flex items-start justify-between gap-4 p-8 md:p-10">
          <div>
            <div className="lux-label">Platform overview</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              All Companies
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Full platform visibility — read-only. {companies.length} companies enrolled.
            </p>
          </div>
        </header>

        {/* Grand totals */}
        <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Total Revenue</div>
            <div className="mt-3 text-3xl font-semibold text-white">{formatCurrency(grandTotals.totalRevenue)}</div>
          </div>
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Companies</div>
            <div className="mt-3 text-3xl font-semibold text-white">{companies.length}</div>
          </div>
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Total Clients</div>
            <div className="mt-3 text-3xl font-semibold text-white">{grandTotals.totalClients}</div>
          </div>
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Active Clients</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-400">{grandTotals.totalActiveClients}</div>
          </div>
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Deletions</div>
            <div className="mt-3 text-3xl font-semibold text-white">{grandTotals.totalDeletions}</div>
          </div>
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Deletion Rate</div>
            <div className="mt-3 text-3xl font-semibold text-white">{grandDeletionRate}%</div>
          </div>
        </section>

        {/* Company table */}
        <section className="public-surface p-6 md:p-8">
          <div className="lux-label">Company performance</div>
          <h2 className="mt-3 text-xl font-semibold text-white">All enrolled companies</h2>

          <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#091426]">
            <table className="min-w-full text-sm">
              <thead className="bg-white/[0.04] text-left text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-medium">Company</th>
                  <th className="px-4 py-4 font-medium text-right">Revenue</th>
                  <th className="px-4 py-4 font-medium text-right">Clients</th>
                  <th className="px-4 py-4 font-medium text-right">Active</th>
                  <th className="px-4 py-4 font-medium text-right">Disputes</th>
                  <th className="px-4 py-4 font-medium text-right">Deletions</th>
                  <th className="px-4 py-4 font-medium text-right">Del. Rate</th>
                  <th className="px-4 py-4 font-medium text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                      No companies enrolled yet.
                    </td>
                  </tr>
                )}
                {companies.map((c) => {
                  const delRate = c.disputes > 0 ? Math.round((c.deletions / c.disputes) * 100) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          <span className="capitalize">{c.status.toLowerCase()}</span>
                          {c.planKey && (
                            <>
                              <span>·</span>
                              <span className="capitalize">{c.planKey.toLowerCase()}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-emerald-400">
                        {formatCurrency(c.revenue)}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-200">{c.clients}</td>
                      <td className="px-4 py-4 text-right text-slate-200">{c.activeClients}</td>
                      <td className="px-4 py-4 text-right text-slate-200">{c.disputes}</td>
                      <td className="px-4 py-4 text-right text-slate-200">{c.deletions}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`font-semibold ${delRate >= 30 ? "text-emerald-400" : delRate >= 15 ? "text-amber-400" : "text-slate-400"}`}>
                          {delRate}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Link
                          href={`/dashboard/super-admin/company/${c.id}`}
                          className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-300 transition hover:border-sky-400/50 hover:bg-sky-500/20"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Affiliate commissions */}
        <section className="public-surface p-6 md:p-8">
          <div className="lux-label">Affiliate program</div>
          <h2 className="mt-3 text-xl font-semibold text-white">Top affiliates</h2>

          <div className="mt-5 grid grid-cols-3 gap-4">
            <div className="public-surface-soft p-4 rounded-xl">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Total Paid Out</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-400">{formatCurrency(affiliateSummary.paidCommissions / 100)}</div>
            </div>
            <div className="public-surface-soft p-4 rounded-xl">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Pending</div>
              <div className="mt-2 text-2xl font-semibold text-amber-400">{formatCurrency(affiliateSummary.pendingCommissions / 100)}</div>
            </div>
            <div className="public-surface-soft p-4 rounded-xl">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">All Time</div>
              <div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(affiliateSummary.totalCommissions / 100)}</div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#091426]">
            <table className="min-w-full text-sm">
              <thead className="bg-white/[0.04] text-left text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-medium">Affiliate</th>
                  <th className="px-4 py-4 font-medium">Plan</th>
                  <th className="px-4 py-4 font-medium text-right">Total Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {affiliateSummary.topAffiliates.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-500">No affiliate commissions yet.</td>
                  </tr>
                )}
                {affiliateSummary.topAffiliates.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-4 font-semibold text-white">{a.name}</td>
                    <td className="px-4 py-4">
                      {a.plan && (
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          a.plan === "ELITE" ? "border-amber-400/30 bg-amber-400/10 text-amber-300" :
                          a.plan === "PRO" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" :
                          "border-blue-400/30 bg-blue-400/10 text-blue-300"
                        }`}>{a.plan}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-emerald-400">{formatCurrency(a.total / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Back */}
        <div className="flex justify-start">
          <Link
            href="/dashboard"
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            ← Back to dashboard
          </Link>
        </div>

      </div>
    </main>
  );
}
