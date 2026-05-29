import Link from "next/link";

import { formatStageLabel, getCompanyWorkspaceSnapshot } from "@/lib/company-workspace";
import { requireSession } from "@/lib/auth";

export default async function IntakePage() {
  const session = await requireSession();
  const workspace = await getCompanyWorkspaceSnapshot(session.tenantId);

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="public-surface p-8 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="lux-label">Operations</div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Client Snapshot</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                High-level view of all client statuses across your pipeline.
              </p>
            </div>
            <Link href="/dashboard/clients" className="lux-button-secondary">
              Open clients
            </Link>
          </div>
        </header>

        {/* Red alert: onboarding pending clients */}
        {(() => {
          const pendingOnboarding = workspace.queue.filter(
            (c) => c.onboardingCompletedAt === null && c.lifecycleStage === "INTAKE_RECEIVED"
          );
          if (pendingOnboarding.length === 0) return null;
          return (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-sm font-semibold text-rose-300">
                  {pendingOnboarding.length} client{pendingOnboarding.length !== 1 ? "s" : ""} waiting on onboarding — haven&apos;t completed sign-up yet
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingOnboarding.map((c) => (
                  <span key={c.id} className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200">
                    {c.firstName} {c.lastName}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Total submissions</div>
            <div className="mt-3 text-3xl font-semibold text-white">{workspace.intakeOverview.totalSubmissions}</div>
          </article>
          <article className="public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Docs pending</div>
            <div className="mt-3 text-3xl font-semibold text-white">{workspace.docsPending}</div>
          </article>
          <article className="public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Strategy ready</div>
            <div className="mt-3 text-3xl font-semibold text-white">{workspace.readyForStrategy}</div>
          </article>
          <article className="public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Letters or mail</div>
            <div className="mt-3 text-3xl font-semibold text-white">{workspace.strategyInFlight}</div>
          </article>
        </section>

        <section className="public-surface p-6 md:p-8">
          <div className="lux-label">Queue</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Inbound records</h2>

          {workspace.queue.length === 0 ? (
            <div className="mt-6 public-surface-soft p-6 text-sm text-slate-300">No intake records yet.</div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#091426]">
              <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
                <thead className="bg-white/[0.04] text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {workspace.queue.map((client) => (
                    <tr
                      key={client.id}
                      className={client.onboardingCompletedAt === null && client.lifecycleStage === "INTAKE_RECEIVED" ? "bg-rose-500/5" : ""}
                    >
                      <td className={`px-4 py-4 font-medium ${client.onboardingCompletedAt === null && client.lifecycleStage === "INTAKE_RECEIVED" ? "text-rose-300" : "text-white"}`}>
                        {client.firstName} {client.lastName}
                        {client.onboardingCompletedAt === null && client.lifecycleStage === "INTAKE_RECEIVED" && (
                          <span className="ml-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                            Pending onboarding
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 capitalize">{formatStageLabel(client.lifecycleStage)}</td>
                      <td className="px-4 py-4">{client.email || client.phone || "No contact"}</td>
                      <td className="px-4 py-4">{client.createdAt.toLocaleDateString()}</td>
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
        </section>
      </div>
    </main>
  );
}
