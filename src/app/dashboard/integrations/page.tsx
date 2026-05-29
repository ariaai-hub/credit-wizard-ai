import Link from "next/link";
import { redirect } from "next/navigation";

import { isSuperAdmin } from "@/lib/admin";
import { requireSession } from "@/lib/auth";
import { getTenantIntegrationSnapshot } from "@/lib/integrations";

export default async function IntegrationsPage() {
  const session = await requireSession();

  if (!isSuperAdmin(session.email)) {
    redirect("/dashboard");
  }

  const snapshot = await getTenantIntegrationSnapshot(session.tenantId);

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="public-surface p-8 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="lux-label">Internal integrations</div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Credit Wizard system routing</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                This page is only for your internal Credit Wizard login.
              </p>
            </div>
            <Link href="/dashboard" className="lux-button-secondary">
              Back to dashboard
            </Link>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-2">
          {snapshot.systems.map((system) => (
            <article key={system.key} className="public-surface p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-semibold text-white">{system.label}</div>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{system.detail}</p>
                </div>
                <span className="lux-pill">{system.status}</span>
              </div>
              <div className="mt-5 space-y-2 text-sm text-slate-300">
                <div>Reference: <span className="font-semibold text-white">{system.reference ?? "Not set"}</span></div>
                <div>Last sync: <span className="font-semibold text-white">{system.lastSyncedAt ? system.lastSyncedAt.toLocaleString() : "Never"}</span></div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
