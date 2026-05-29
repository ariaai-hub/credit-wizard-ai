import Link from "next/link";

import { requireSession } from "@/lib/auth";
import { getTenantAuditOverview, getTenantAuditTrail } from "@/lib/audit";

function formatEventLabel(eventType: string) {
  return eventType.toLowerCase().replaceAll("_", " ");
}

function formatSnapshot(value: unknown) {
  if (!value) return "-";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function AuditPage() {
  const session = await requireSession();
  const [overview, events] = await Promise.all([
    getTenantAuditOverview(session.tenantId),
    getTenantAuditTrail(session.tenantId),
  ]);

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10 md:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Audit trail</span>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Tenant event history</h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-stone-600">
                This page gives the tenant one place to inspect what happened across onboarding, billing, intake, invitations, and downstream sync activity.
              </p>
            </div>
            <Link href="/dashboard" className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900">
              Back to dashboard
            </Link>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Overview</h2>
            <div className="mt-4 space-y-3 text-sm text-stone-600">
              <div>Total events: <span className="font-semibold text-stone-900">{overview.totalEvents}</span></div>
              <div>Recent events tracked: <span className="font-semibold text-stone-900">{overview.latestEvents.length}</span></div>
            </div>

            <div className="mt-6 space-y-3">
              {overview.eventTypeCounts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                  No audit events yet.
                </div>
              ) : (
                overview.eventTypeCounts.map((item) => (
                  <div key={item.eventType} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">{formatEventLabel(item.eventType)}</div>
                    <div className="mt-1 text-2xl font-semibold text-stone-950">{item.count}</div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Recent event types</h2>
            {overview.latestEvents.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
                No recent events yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {overview.latestEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    <div className="font-semibold text-stone-900">{event.eventType}</div>
                    <div className="mt-1">{event.createdAt.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Event stream</h2>
          {events.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-sm text-stone-500">
              No tenant events yet.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {events.map((event) => (
                <article key={event.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{event.actorType}</div>
                      <h3 className="mt-2 text-lg font-semibold text-stone-950">{event.eventType}</h3>
                      <div className="mt-2 space-y-1 text-sm text-stone-600">
                        <div>When: <span className="font-medium text-stone-900">{event.createdAt.toLocaleString()}</span></div>
                        <div>Reference: <span className="font-medium text-stone-900">{event.referenceType ?? "-"} / {event.referenceId ?? "-"}</span></div>
                        <div>Actor user: <span className="font-medium text-stone-900">{event.actorUser?.name ?? event.actorUser?.email ?? "System / unknown"}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Input snapshot</div>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">{formatSnapshot(event.inputSnapshotJson)}</pre>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Output snapshot</div>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">{formatSnapshot(event.outputSnapshotJson)}</pre>
                    </div>
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
