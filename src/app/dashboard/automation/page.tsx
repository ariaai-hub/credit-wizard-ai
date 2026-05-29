import { redirect } from "next/navigation";

import { isSuperAdmin } from "@/lib/admin";
import { requireSession } from "@/lib/auth";
import { getCompanyWorkspaceSnapshot } from "@/lib/company-workspace";
import { getProviderSignupFollowUpQueue, getProviderSignupFollowUpRunHistory } from "@/lib/provider-followups";

function formatChannelLabel(value: string) {
  return value.toUpperCase();
}

export default async function AutomationPage() {
  const session = await requireSession();

  if (!isSuperAdmin(session.email)) {
    redirect("/dashboard");
  }

  const [workspace, followUpQueue, recentRuns] = await Promise.all([
    getCompanyWorkspaceSnapshot(session.tenantId),
    getProviderSignupFollowUpQueue(session.tenantId),
    getProviderSignupFollowUpRunHistory(session.tenantId),
  ]);

  const dueNow = followUpQueue.filter((item) => item.decision.due);
  const smsRecommended = dueNow.filter((item) => item.decision.recommendedChannel === "sms").length;
  const emailRecommended = dueNow.filter((item) => item.decision.recommendedChannel === "email").length;

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="public-surface p-8 md:p-10">
          <div>
            <div className="lux-label">Internal automations</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Credit Wizard follow-up runs</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              This automation view is internal only.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Due now</div>
            <div className="mt-3 text-3xl font-semibold text-white">{dueNow.length}</div>
          </article>
          <article className="public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">SMS first</div>
            <div className="mt-3 text-3xl font-semibold text-white">{smsRecommended}</div>
          </article>
          <article className="public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Email first</div>
            <div className="mt-3 text-3xl font-semibold text-white">{emailRecommended}</div>
          </article>
          <article className="public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Active clients</div>
            <div className="mt-3 text-3xl font-semibold text-white">{workspace.intakeOverview.totalClients}</div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
          <article className="public-surface p-6 md:p-8">
            <div className="lux-label">Queue</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Clients due for a touch</h2>

            {followUpQueue.length === 0 ? (
              <div className="mt-6 public-surface-soft p-6 text-sm text-slate-300">No follow-up records yet.</div>
            ) : (
              <div className="mt-6 grid gap-3">
                {followUpQueue.map(({ client, decision }) => (
                  <article key={client.id} className="public-surface-soft p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-white">{client.firstName} {client.lastName}</div>
                        <div className="mt-1 text-sm text-slate-300">{client.email ?? client.phone ?? "No direct contact"}</div>
                      </div>
                      <span className="lux-pill">{formatChannelLabel(decision.recommendedChannel)}</span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm text-slate-300">
                      <div>Follow-up: <span className="font-semibold text-white">{decision.label}</span></div>
                      <div>Due: <span className="font-semibold text-white">{decision.due ? "Now" : "Scheduled"}</span></div>
                      <div>Next touch: <span className="font-semibold text-white">{decision.nextTouchAt ? decision.nextTouchAt.toLocaleString() : "Now"}</span></div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>

          <article className="public-surface p-6 md:p-8">
            <div className="lux-label">Recent activity</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Recent automation runs</h2>

            {recentRuns.length === 0 ? (
              <div className="mt-6 public-surface-soft p-6 text-sm text-slate-300">No automation runs recorded yet.</div>
            ) : (
              <div className="mt-6 grid gap-3">
                {recentRuns.map((run) => (
                  <div key={run.id} className="public-surface-soft p-4 text-sm text-slate-300">
                    <div className="font-semibold text-white">{run.eventType.replaceAll("_", " ").toLowerCase()}</div>
                    <div className="mt-2">{run.createdAt.toLocaleString()}</div>
                    <div className="mt-1">
                      {run.dryRun === null ? "Unknown mode" : run.dryRun ? "Dry run" : "Live run"}
                      {run.trigger ? ` via ${run.trigger}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
