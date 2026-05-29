import { requireSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { formatStageLabel } from "@/lib/company-workspace";
import { getStripe } from "@/lib/stripe";
import Link from "next/link";

async function getCompanyData(companyId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: companyId },
    include: {
      subscriptions: {
        where: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE", "GRACE"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!tenant) return null;

  const [clients, disputes, teamMembers] = await Promise.all([
    prisma.client.findMany({
      where: { tenantId: companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        lifecycleStage: true,
        onboardingCompletedAt: true,
        mailPreference: true,
        mailSentAt: true,
        trackingNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.disputeTradelineRecord.findMany({
      where: { disputeCase: { tenantId: companyId } },
      select: {
        id: true,
        status: true,
        responseClass: true,
        bureau: true,
        furnisherName: true,
        collectorName: true,
        accountNumberMasked: true,
        createdAt: true,
        disputeCase: {
          select: {
            clientId: true,
            client: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { tenantId: companyId },
      select: { id: true, email: true, name: true, role: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const stripe = getStripe();
  const sub = tenant.subscriptions[0];
  let revenue = 0;
  if (sub?.providerSubscriptionId) {
    try {
      const subData = await stripe.subscriptions.retrieve(sub.providerSubscriptionId);
      revenue = (subData.items.data[0]?.price.unit_amount || 0) / 100;
    } catch { /* ignore */ }
  }

  const activeClients = clients.filter((c) => c.onboardingCompletedAt).length;
  const totalDeletions = disputes.filter((d) => d.responseClass === "deleted").length;
  const deletionRate = disputes.length > 0 ? Math.round((totalDeletions / disputes.length) * 100) : 0;

  return {
    tenant,
    clients,
    disputes,
    teamMembers,
    revenue,
    activeClients,
    totalDeletions,
    deletionRate,
  };
}

function tierLabel(status: string | null) {
  switch (status) {
    case "TRIALING": return { label: "Trial", class: "border-sky-500/25 bg-sky-500/10 text-sky-300" };
    case "ACTIVE": return { label: "Active", class: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" };
    case "PAST_DUE": return { label: "Past Due", class: "border-amber-500/25 bg-amber-500/10 text-amber-300" };
    case "GRACE": return { label: "Grace", class: "border-orange-500/25 bg-orange-500/10 text-orange-300" };
    case "CANCELLED": return { label: "Cancelled", class: "border-rose-500/25 bg-rose-500/10 text-rose-300" };
    default: return { label: status ?? "Unknown", class: "border-white/10 bg-white/5 text-slate-400" };
  }
}

export default async function CompanyDrillDownPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const session = await requireSession();
  if (!isSuperAdmin(session.email)) redirect("/dashboard");

  const { companyId } = await params;
  const data = await getCompanyData(companyId);
  if (!data) redirect("/dashboard/super-admin");

  const { tenant, clients, disputes, teamMembers, revenue, activeClients, totalDeletions, deletionRate } = data;
  const sub = tenant.subscriptions[0];
  const { label: tierLabelText, class: tierClass } = tierLabel(sub?.status ?? null);

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

        {/* Header */}
        <header className="public-surface flex items-start justify-between gap-4 p-8 md:p-10">
          <div>
            <div className="lux-label">Platform view</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              {tenant.name}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Enrolled {tenant.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400 capitalize">
              {tenant.status.toLowerCase()}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tierClass}`}>
              {tierLabelText}
            </span>
          </div>
        </header>

        {/* KPI cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Monthly Revenue</div>
            <div className="mt-3 text-3xl font-semibold text-white">{formatCurrency(revenue)}</div>
            {sub?.planKey && <div className="mt-1 text-sm text-slate-400 capitalize">{sub.planKey.toLowerCase()} plan</div>}
          </div>
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Total Clients</div>
            <div className="mt-3 text-3xl font-semibold text-white">{clients.length}</div>
            <div className="mt-1 text-sm text-slate-400">{activeClients} onboarding complete</div>
          </div>
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Disputes Filed</div>
            <div className="mt-3 text-3xl font-semibold text-white">{disputes.length}</div>
          </div>
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Deletion Rate</div>
            <div className={`mt-3 text-3xl font-semibold ${deletionRate >= 30 ? "text-emerald-400" : deletionRate >= 15 ? "text-amber-400" : "text-white"}`}>
              {deletionRate}%
            </div>
            <div className="mt-1 text-sm text-slate-400">{totalDeletions} items removed</div>
          </div>
        </section>

        {/* Three-column: Clients, Disputes, Team */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Clients */}
          <section className="public-surface p-6 md:p-8">
            <div className="lux-label">Clients</div>
            <h2 className="mt-3 text-xl font-semibold text-white">{clients.length} enrolled</h2>
            <div className="mt-5 flex flex-col gap-2">
              {clients.length === 0 && <div className="text-sm text-slate-500">No clients yet.</div>}
              {clients.slice(0, 10).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{c.firstName} {c.lastName}</div>
                    <div className="text-xs text-slate-400">{c.email || "no email"}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-semibold ${c.onboardingCompletedAt ? "text-emerald-300" : "text-rose-300"}`}>
                      {c.onboardingCompletedAt ? "Active" : "Pending"}
                    </div>
                    <div className="text-xs text-slate-500">{formatStageLabel(c.lifecycleStage)}</div>
                  </div>
                </div>
              ))}
              {clients.length > 10 && <div className="text-center text-sm text-slate-500 pt-2">+{clients.length - 10} more</div>}
            </div>
          </section>

          {/* Disputes */}
          <section className="public-surface p-6 md:p-8">
            <div className="lux-label">Disputes</div>
            <h2 className="mt-3 text-xl font-semibold text-white">{disputes.length} filed</h2>
            <div className="mt-5 flex flex-col gap-2">
              {disputes.length === 0 && <div className="text-sm text-slate-500">No disputes yet.</div>}
              {disputes.slice(0, 8).map((d) => (
                <div key={d.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{(d.furnisherName || d.collectorName || "Unknown")}</div>
                      <div className="text-xs text-slate-400">{d.bureau || "N/A"} · {d.accountNumberMasked || "N/A"}</div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      d.responseClass === "deleted"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : d.status === "DISPUTED"
                        ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                        : "border-white/10 bg-white/5 text-slate-400"
                    }`}>
                      {d.responseClass === "deleted" ? "Deleted" : d.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
              {disputes.length > 8 && <div className="text-center text-sm text-slate-500 pt-2">+{disputes.length - 8} more</div>}
            </div>
          </section>

          {/* Team */}
          <section className="public-surface p-6 md:p-8">
            <div className="lux-label">Team Members</div>
            <h2 className="mt-3 text-xl font-semibold text-white">{teamMembers.length} users</h2>
            <div className="mt-5 flex flex-col gap-2">
              {teamMembers.length === 0 && <div className="text-sm text-slate-500">No team members.</div>}
              {teamMembers.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{u.name || u.email}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                  <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 capitalize">
                    {u.role.toLowerCase().replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Back */}
        <div className="flex justify-start">
          <Link
            href="/dashboard/super-admin"
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            ← Back to all companies
          </Link>
        </div>

      </div>
    </main>
  );
}
