import Link from "next/link";

import { Prisma } from "@prisma/client";

import { MAIL_CHARGE_RULES } from "@/lib/billing";
import { isSuperAdmin } from "@/lib/admin";
import { requireSession } from "@/lib/auth";
import { formatStageLabel, getCompanyWorkspaceSnapshot, safeQuery } from "@/lib/company-workspace";
import { getTenantIntegrationSnapshot } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { PlatformSelector } from "@/components/platform-overview";
import { getStripe } from "@/lib/stripe";

function SurfaceCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="public-surface-soft p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
    </article>
  );
}

function formatMailPreferenceLabel(mailPreference: string) {
  return mailPreference === "CERTIFIED" ? "Certified" : "Standard";
}

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getStartOfWeek() {
  const now = getStartOfToday();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  return next;
}

function getStartOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getDaysAgo(days: number) {
  const date = getStartOfToday();
  date.setDate(date.getDate() - days);
  return date;
}

function getNumber(value: unknown) {
  return typeof value === "number" ? value : typeof value === "string" ? Number(value) || 0 : 0;
}

function deriveRevenue(inputSnapshotJson: unknown) {
  if (!inputSnapshotJson || typeof inputSnapshotJson !== "object" || Array.isArray(inputSnapshotJson)) {
    return 0;
  }

  const snapshot = inputSnapshotJson as Record<string, unknown>;
  const amountPaidCents = getNumber(snapshot.amountPaidCents);
  const amountTotalCents = getNumber(snapshot.amountTotalCents);

  if (amountPaidCents > 0) return amountPaidCents / 100;
  if (amountTotalCents > 0) return amountTotalCents / 100;
  return 0;
}

function buildGrowthLabel(current: number, previous: number) {
  if (previous === 0 && current === 0) return "No change yet.";
  if (previous === 0) return `Up from 0 to ${current}.`;
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent >= 0 ? "Up" : "Down"} ${Math.abs(percent)}% vs prior 30 days.`;
}

function isMissingSchemaError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code);
}

export default async function DashboardPage() {
  const session = await requireSession();
  const internalOwner = isSuperAdmin(session.email);
  const workspace = await getCompanyWorkspaceSnapshot(session.tenantId);

  // Fetch platform-wide data for super admins
  const platformData = internalOwner
    ? await (async () => {
        const [tenants, clients, disputes] = await Promise.all([
          prisma.tenant.findMany({
            include: {
              subscriptions: {
                where: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE", "GRACE"] } },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          }),
          prisma.client.findMany({ select: { id: true, tenantId: true, onboardingCompletedAt: true } }),
          prisma.disputeTradelineRecord.findMany({
            select: {
              id: true,
              status: true,
              responseClass: true,
              disputeCase: { select: { tenantId: true } },
            },
          }),
        ]);

        const stripe = getStripe();
        const tenantRevenue = await Promise.all(
          tenants.map(async (t) => {
            const sub = t.subscriptions[0];
            if (!sub?.providerSubscriptionId) return { tenantId: t.id, revenue: 0 };
            try {
              const subData = await stripe.subscriptions.retrieve(sub.providerSubscriptionId);
              return { tenantId: t.id, revenue: (subData.items.data[0]?.price.unit_amount || 0) / 100 };
            } catch {
              return { tenantId: t.id, revenue: 0 };
            }
          })
        );
        const revenueMap = Object.fromEntries(tenantRevenue.map((r) => [r.tenantId, r.revenue]));

        const companies = tenants.map((t) => {
          const c = clients.filter((c) => c.tenantId === t.id);
          const d = disputes.filter((d) => d.disputeCase?.tenantId === t.id);
          const sub = t.subscriptions[0];
          return {
            id: t.id,
            name: t.name || "Unnamed",
            status: t.status,
            planKey: sub?.planKey ?? null,
            subscriptionStatus: sub?.status ?? null,
            clients: c.length,
            activeClients: c.filter((x) => x.onboardingCompletedAt).length,
            disputes: d.length,
            deletions: d.filter((x) => x.responseClass === "deleted").length,
            revenue: revenueMap[t.id] ?? 0,
          };
        });

        return {
          companies,
          grandTotals: {
            totalRevenue: companies.reduce((s, c) => s + c.revenue, 0),
            totalClients: companies.reduce((s, c) => s + c.clients, 0),
            totalActiveClients: companies.reduce((s, c) => s + c.activeClients, 0),
            totalDisputes: companies.reduce((s, c) => s + c.disputes, 0),
            totalDeletions: companies.reduce((s, c) => s + c.deletions, 0),
          },
        };
      })()
    : null;

  if (!internalOwner) {
    return (
      <main className="app-frame px-6 py-8 md:px-10 md:py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <header className="public-surface p-8 md:p-10">
            <div className="lux-label">Company workspace</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">{workspace.tenant.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              See only your company’s client pipeline, dispute progress, mail queue, team access, and billing capacity.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <SurfaceCard label="Active clients" value={workspace.intakeOverview.totalClients} detail="Client records inside your company account." />
            <SurfaceCard label="Docs pending" value={workspace.docsPending} detail="Files still waiting on intake docs or report uploads." />
            <SurfaceCard label="Ready for strategy" value={workspace.readyForStrategy} detail="Files ready for dispute planning or letter prep." />
            <SurfaceCard label="Open disputes" value={workspace.disputeOverview.openCases} detail="Cases currently active, in review, or monitoring." />
            <SurfaceCard label="Mail queued" value={workspace.mailQueued} detail="Client mail waiting to be sent from your queue." />
            <SurfaceCard label="Tokens remaining" value={workspace.tokenBalance} detail={`Seats ${workspace.seatUsage.usedSeats}/${workspace.seatUsage.seatLimit}`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
            <article className="public-surface p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="lux-label">Client snapshot</div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Recent client records</h2>
                </div>
                <Link href="/dashboard/clients" className="lux-button-secondary">
                  Open clients
                </Link>
              </div>

              {workspace.queue.length === 0 ? (
                <div className="mt-6 public-surface-soft p-6 text-sm text-slate-300">No client records yet.</div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#091426]">
                  <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-200">
                    <thead className="bg-white/[0.04] text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Client</th>
                        <th className="px-4 py-3 font-semibold">Stage</th>
                        <th className="px-4 py-3 font-semibold">Mail</th>
                        <th className="px-4 py-3 font-semibold">Last update</th>
                        <th className="px-4 py-3 font-semibold">Record</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {workspace.queue.slice(0, 10).map((client) => (
                        <tr key={client.id}>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-white">{client.firstName} {client.lastName}</div>
                            <div className="text-xs text-slate-400">{client.email || client.phone || "No contact stored"}</div>
                          </td>
                          <td className="px-4 py-4 capitalize">{formatStageLabel(client.lifecycleStage)}</td>
                          <td className="px-4 py-4">{client.lifecycleStage === "MAIL_QUEUED" ? formatMailPreferenceLabel(client.mailPreference) : "Not queued"}</td>
                          <td className="px-4 py-4">{client.updatedAt.toLocaleDateString()}</td>
                          <td className="px-4 py-4">
                            <Link href={`/dashboard/client-preview/${client.id}`} className="font-semibold text-sky-300 hover:text-sky-200">
                              View record
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <div className="grid gap-6">
              <article className="public-surface p-6">
                <div className="lux-label">Account capacity</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Plan and usage</h2>
                <div className="mt-5 grid gap-3">
                  <SurfaceCard label="Current plan" value={workspace.plan?.name ?? workspace.subscription?.planKey ?? "Not set"} detail="Your current subscription for this company." />
                  <SurfaceCard label="Standard mail" value={formatCurrency(MAIL_CHARGE_RULES.REGULAR_MAIL)} detail="Billed separately from tokens." />
                  <SurfaceCard label="Certified mail" value={formatCurrency(MAIL_CHARGE_RULES.CERTIFIED_MAIL)} detail="Billed separately from tokens." />
                  <SurfaceCard label="Support messages" value={workspace.supportMessages} detail="Messages received from your client portal so far." />
                </div>
              </article>

              <article className="public-surface p-6">
                <div className="lux-label">Lifecycle mix</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Where the workload sits</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {workspace.intakeOverview.stageCounts.map((item) => (
                    <div key={item.stage} className="public-surface-soft p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">{formatStageLabel(item.stage)}</div>
                      <div className="mt-2 text-3xl font-semibold text-white">{item.count}</div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const weekStart = getStartOfWeek();
  const monthStart = getStartOfMonth();
  const previous30Start = getDaysAgo(37);
  const previous30End = getDaysAgo(7);

  const [revenueAudits, weekClients, prior30Clients, pastDueSubscriptions, failedAutomationsToday, integrationSnapshot] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        tenantId: session.tenantId,
        eventType: { in: ["STRIPE_CHECKOUT_COMPLETED", "STRIPE_INVOICE_PAID"] },
      },
      select: { createdAt: true, inputSnapshotJson: true },
    }),
    safeQuery(() => prisma.client.count({ where: { tenantId: session.tenantId, createdAt: { gte: weekStart } } }), 0),
    safeQuery(
      () =>
        prisma.client.count({
          where: {
            tenantId: session.tenantId,
            createdAt: { gte: previous30Start, lt: previous30End },
          },
        }),
      0,
    ),
    prisma.billingSubscription.count({
      where: { tenantId: session.tenantId, status: "PAST_DUE" },
    }),
    safeQuery(
      () =>
        prisma.auditLog.count({
          where: {
            tenantId: session.tenantId,
            createdAt: { gte: getStartOfToday() },
            eventType: { contains: "FAILED" },
          },
        }),
      0,
    ),
    getTenantIntegrationSnapshot(session.tenantId),
  ]);

  const monthRevenue = revenueAudits
    .filter((audit) => audit.createdAt >= monthStart)
    .reduce((sum, audit) => sum + deriveRevenue(audit.inputSnapshotJson), 0);
  const weekRevenue = revenueAudits
    .filter((audit) => audit.createdAt >= weekStart)
    .reduce((sum, audit) => sum + deriveRevenue(audit.inputSnapshotJson), 0);
  const growthLabel = buildGrowthLabel(weekClients, prior30Clients);
  const configuredSystems = integrationSnapshot.systems.filter((system) => system.status === "configured").length;

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="public-surface flex items-start justify-between gap-4 p-8 md:p-10">
          <div>
            <div className="lux-label">Credit Wizard HQ</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">{workspace.tenant.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Internal performance, billing health, mail pressure, and system posture for your personal Credit Wizard login.
            </p>
          </div>
          {platformData && (
            <div className="shrink-0 pt-2">
              <PlatformSelector companies={platformData.companies} grandTotals={platformData.grandTotals} />
            </div>
          )}
        </header>



        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <SurfaceCard label="Monthly revenue" value={formatCurrency(monthRevenue)} detail="Successful billing events this month." />
          <SurfaceCard label="Last week revenue" value={formatCurrency(weekRevenue)} detail="Successful billing events in the last 7 days." />
          <SurfaceCard label="New clients" value={weekClients} detail={growthLabel} />
          <SurfaceCard label="Past due" value={pastDueSubscriptions} detail="Subscriber accounts needing recovery." />
          <SurfaceCard label="Automation failures" value={failedAutomationsToday} detail="Failed jobs or follow-up runs logged today." />
          <SurfaceCard label="Systems configured" value={`${configuredSystems}/${integrationSnapshot.systems.length}`} detail="Internal systems ready for use." />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <article className="public-surface p-6 md:p-8">
            <div className="lux-label">Internal operations</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Cross-tenant workload</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <SurfaceCard label="Active clients" value={workspace.intakeOverview.totalClients} detail="Client records inside this internal workspace." />
              <SurfaceCard label="Open disputes" value={workspace.disputeOverview.openCases} detail="Cases still in motion." />
              <SurfaceCard label="Mail queued" value={workspace.mailQueued} detail="Mail waiting to go out." />
              <SurfaceCard label="Tokens remaining" value={workspace.tokenBalance} detail="Combined included and purchased balance." />
            </div>
          </article>

          <article className="public-surface p-6 md:p-8">
            <div className="lux-label">Internal tools</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Quick access</h2>
            <div className="mt-6 grid gap-3">
              <Link href="/dashboard/integrations" className="lux-button-secondary w-full">Open integrations</Link>
              <Link href="/dashboard/audit" className="lux-button-secondary w-full">Open audit trail</Link>
              <Link href="/dashboard/automation" className="lux-button-secondary w-full">Open automation center</Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
