import Link from "next/link";

import { requireSession } from "@/lib/auth";
import { formatStageLabel, getCompanyWorkspaceSnapshot } from "@/lib/company-workspace";
import { ClientCreateForm } from "./client-create-form";

export default async function ClientsPage() {
  const session = await requireSession();
  const workspace = await getCompanyWorkspaceSnapshot(session.tenantId);

  const queue = workspace.queue.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    lifecycleStage: c.lifecycleStage,
    onboardingCompletedAt: (c as any).onboardingCompletedAt ?? null,
    createdAt: c.createdAt,
  }));

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="public-surface flex items-start justify-between gap-4 p-8 md:p-10">
          <div>
            <div className="lux-label">Clients</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Your company&apos;s client list</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Every record here belongs to your company only.
            </p>
          </div>
          <div className="lux-label hidden sm:block">Total: {queue.length}</div>
        </header>

        <section className="public-surface p-6 md:p-8">
          {queue.length === 0 ? (
            <div className="public-surface-soft p-6 text-sm text-slate-300">No client records yet. Create a client below to get started.</div>
          ) : (
            <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#091426]">
              <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
                <thead className="bg-white/[0.04] text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Onboarding</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {queue.map((client) => (
                    <tr key={client.id}>
                      <td className="px-4 py-4 font-medium text-white">
                        {client.firstName} {client.lastName}
                      </td>
                      <td className="px-4 py-4 capitalize text-slate-300">
                        {formatStageLabel(client.lifecycleStage)}
                      </td>
                      <td className="px-4 py-4">{client.email || client.phone || "—"}</td>
                      <td className="px-4 py-4">
                        {client.onboardingCompletedAt ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">{new Date(client.createdAt).toLocaleDateString()}</td>
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

        <ClientCreateForm />
      </div>
    </main>
  );
}
