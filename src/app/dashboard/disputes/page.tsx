import Link from "next/link";

import { requireSession } from "@/lib/auth";
import { formatStageLabel, getCompanyWorkspaceSnapshot } from "@/lib/company-workspace";

export default async function DisputesPage() {
  const session = await requireSession();
  const workspace = await getCompanyWorkspaceSnapshot(session.tenantId);
  const disputeReadyClients = workspace.queue.filter((client) =>
    ["READY_FOR_STRATEGY", "STRATEGY_READY", "LETTER_GENERATED", "MAIL_QUEUED"].includes(client.lifecycleStage),
  );

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="public-surface p-8 md:p-10">
          <div className="lux-label">Disputes</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Dispute progress</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
            See which client files are in dispute review, active dispute handling, or waiting on letters and mail.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Open cases</div>
            <div className="mt-3 text-3xl font-semibold text-white">{workspace.disputeOverview.openCases}</div>
          </div>
          <div className="public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Escalated cases</div>
            <div className="mt-3 text-3xl font-semibold text-white">{workspace.disputeOverview.escalatedCases}</div>
          </div>
          <div className="public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Ready for dispute work</div>
            <div className="mt-3 text-3xl font-semibold text-white">{disputeReadyClients.length}</div>
          </div>
        </section>

        <section className="public-surface p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="lux-label">Queue</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Files moving through dispute work</h2>
            </div>
            <Link href="/dashboard/intake" className="lux-button-secondary">
              Open intake
            </Link>
          </div>

          {disputeReadyClients.length === 0 ? (
            <div className="mt-6 public-surface-soft p-6 text-sm text-slate-300">No files are in the dispute-ready stages yet.</div>
          ) : (
            <div className="mt-6 grid gap-3">
              {disputeReadyClients.map((client) => (
                <article key={client.id} className="public-surface-soft p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-white">{client.firstName} {client.lastName}</div>
                      <div className="mt-1 text-sm text-slate-300">{client.email || client.phone || "No contact"}</div>
                    </div>
                    <span className="lux-pill">{formatStageLabel(client.lifecycleStage)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
