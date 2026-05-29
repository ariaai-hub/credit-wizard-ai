import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MailQueueActions } from "./mail-queue-actions";
import { Suspense } from "react";
import { MailQueueFilters } from "./mail-queue-filters";

async function getClients(stage: "MAIL_QUEUED" | "MAIL_SENT", tenantId?: string) {
  const where: Record<string, unknown> = { lifecycleStage: stage };
  if (tenantId) where.tenantId = tenantId;

  return prisma.client.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      mailPreference: true,
      updatedAt: true,
      mailSentAt: true,
      trackingNumber: true,
      tenant: {
        select: {
          id: true,
          name: true,
          primaryColor: true,
          accentColor: true,
          defaultMailType: true,
          mailTokenAccount: {
            select: { purchasedBalance: true, usedBalance: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "asc" },
  });
}

export default async function MailQueuePage({
  searchParams,
}: {
  searchParams: { tab?: string; q?: string; type?: string; from?: string; to?: string };
}) {
  const session = await requireSession();

  if (!["MAIL_TEAM", "OWNER", "ADMIN"].includes(session.role)) {
    redirect("/dashboard");
  }

  const activeTab = searchParams.tab === "sent" ? "sent" : "queued";
  const stage = activeTab === "queued" ? "MAIL_QUEUED" : "MAIL_SENT";

  let clients = await getClients(stage, session.role !== "OWNER" ? session.tenantId : undefined);

  // Client-side filters (sync with URL params for SSR re-render)
  const q = (searchParams.q ?? "").toLowerCase();
  const typeFilter = searchParams.type ?? "all";
  const fromDate = searchParams.from ? new Date(searchParams.from) : null;
  const toDate = searchParams.to ? new Date(searchParams.to) : null;

  if (q) {
    clients = clients.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.trackingNumber?.toLowerCase().includes(q)
    );
  }

  if (typeFilter !== "all") {
    clients = clients.filter((c) => c.mailPreference === typeFilter);
  }

  if (fromDate) {
    clients = clients.filter((c) => {
      const d = activeTab === "sent" ? c.mailSentAt : c.updatedAt;
      return d && d >= fromDate;
    });
  }

  if (toDate) {
    clients = clients.filter((c) => {
      const d = activeTab === "sent" ? c.mailSentAt : c.updatedAt;
      return d && d <= toDate;
    });
  }

  const queuedCount = await prisma.client.count({ where: { lifecycleStage: "MAIL_QUEUED", tenantId: session.role !== "OWNER" ? session.tenantId : undefined } });
  const sentCount = await prisma.client.count({ where: { lifecycleStage: "MAIL_SENT", tenantId: session.role !== "OWNER" ? session.tenantId : undefined } });

  // Group by tenant
  const byCompany = clients.reduce<Record<string, typeof clients>>((acc, client) => {
    const tid = client.tenant.id;
    if (!acc[tid]) acc[tid] = [];
    acc[tid].push(client);
    return acc;
  }, {});

  const companies = Object.values(byCompany);

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header>
          <div className="lux-label">Operations</div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
            Mail Queue
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            {activeTab === "queued"
              ? "Letters ready to be mailed. Mark as mailed when shipped."
              : "All letters that have been shipped. Keep records for 90 days."}
          </p>
        </header>

        {/* Tab toggle */}
        <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
          <a
            href="/dashboard/mail"
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "queued" ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>📋</span>
            Ready to Mail
            {queuedCount > 0 && (
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                {queuedCount}
              </span>
            )}
          </a>
          <a
            href="/dashboard/mail?tab=sent"
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "sent" ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>📮</span>
            Already Sent
            {sentCount > 0 && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                {sentCount}
              </span>
            )}
          </a>
        </div>

        {/* Filters */}
        <Suspense fallback={<div className="h-16 rounded-2xl border border-white/10 bg-white/5" />}>
          <MailQueueFilters
            activeTab={activeTab}
            q={searchParams.q ?? ""}
            type={searchParams.type ?? "all"}
            from={searchParams.from ?? ""}
            to={searchParams.to ?? ""}
          />
        </Suspense>

        {clients.length === 0 ? (
          <div className="public-surface p-12 text-center">
            <div className="mb-4 text-5xl">{activeTab === "queued" ? "📬" : "📭"}</div>
            <p className="text-slate-400">
              {activeTab === "queued"
                ? "Nothing queued to mail right now."
                : "No letters have been mailed yet."}
            </p>
            {q && (
              <p className="mt-2 text-sm text-slate-500">
                Try adjusting your filters.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-8">
            {companies.map((companyClients) => {
              const tenant = companyClients[0].tenant;
              const mailBalance = tenant.mailTokenAccount
                ? tenant.mailTokenAccount.purchasedBalance - tenant.mailTokenAccount.usedBalance
                : 0;

              return (
                <section key={tenant.id}>
                  {/* Company header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tenant.primaryColor || "#3b82f6" }}
                      />
                      <h2 className="text-lg font-semibold text-white">{tenant.name}</h2>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
                        {companyClients.length} item{companyClients.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {activeTab === "queued" && (
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Mailing tokens</div>
                        <div className={`text-sm font-semibold ${mailBalance < companyClients.length ? "text-rose-400" : "text-emerald-400"}`}>
                          {mailBalance} available
                        </div>
                      </div>
                    )}
                    {activeTab === "sent" && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                        Mailed
                      </span>
                    )}
                  </div>

                  {/* Table */}
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#091426]">
                    <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                      <thead className="bg-white/[0.04]">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-slate-400">Client</th>
                          {activeTab === "sent" && (
                            <>
                              <th className="px-4 py-3 font-semibold text-slate-400">Tracking #</th>
                              <th className="px-4 py-3 font-semibold text-slate-400">Mailed at</th>
                              <th className="px-4 py-3 font-semibold text-slate-400">Days ago</th>
                            </>
                          )}
                          {activeTab === "queued" && <th className="px-4 py-3 font-semibold text-slate-400">Contact</th>}
                          <th className="px-4 py-3 font-semibold text-slate-400">Mail type</th>
                          <th className="px-4 py-3 font-semibold text-slate-400">Letters</th>
                          {activeTab === "queued" && <th className="px-4 py-3 font-semibold text-slate-400">Action</th>}
                          {activeTab === "queued" && <th className="px-4 py-3 font-semibold text-slate-400">Queued at</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {companyClients.map((client) => {
                          const mailDate = client.mailSentAt ?? client.updatedAt;
                          const daysAgo = mailDate
                            ? Math.floor((Date.now() - mailDate.getTime()) / (1000 * 60 * 60 * 24))
                            : null;

                          return (
                            <tr key={client.id} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-4">
                                <div className="font-semibold text-white">
                                  {client.firstName} {client.lastName}
                                </div>
                              </td>

                              {activeTab === "sent" && (
                                <>
                                  <td className="px-4 py-4">
                                    {client.trackingNumber ? (
                                      <a
                                        href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${client.trackingNumber}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono text-xs text-sky-400 hover:text-sky-300 underline"
                                      >
                                        {client.trackingNumber}
                                      </a>
                                    ) : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 text-slate-400">
                                    {mailDate
                                      ? mailDate.toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-4">
                                    {daysAgo !== null && (
                                      <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                          daysAgo > 60
                                            ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                                            : daysAgo > 30
                                            ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                                            : "border border-white/10 bg-white/5 text-slate-400"
                                        }`}
                                      >
                                        {daysAgo}d ago
                                      </span>
                                    )}
                                  </td>
                                </>
                              )}

                              {activeTab === "queued" && (
                                <td className="px-4 py-4 text-slate-400">
                                  {client.email || client.phone || "—"}
                                </td>
                              )}

                              <td className="px-4 py-4">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    client.mailPreference === "CERTIFIED"
                                      ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                                      : "border border-white/10 bg-white/5 text-slate-300"
                                  }`}
                                >
                                  {client.mailPreference === "CERTIFIED" ? "✦ Certified" : "Standard"}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <a
                                  href={`/dashboard/mail/letters/${client.id}`}
                                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                                >
                                  View letters
                                </a>
                              </td>

                              {activeTab === "queued" && (
                                <>
                                  <td className="px-4 py-4">
                                    <MailQueueActions
                                      clientId={client.id}
                                      tenantId={tenant.id}
                                      tenantName={tenant.name}
                                      mailPreference={client.mailPreference}
                                      defaultMailType={tenant.defaultMailType}
                                      remainingBalance={mailBalance}
                                    />
                                  </td>
                                  <td className="px-4 py-4 text-slate-500">
                                    {client.updatedAt.toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Retention notice */}
        {activeTab === "sent" && clients.length > 0 && (
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
            <p className="text-sm text-slate-300">
              <strong className="text-sky-300">Suggested retention:</strong> Keep mailed letter records for{" "}
              <strong className="text-white">90 days</strong> after the mailed date. This covers the full credit
              bureau investigation window (typically 30–45 days) plus buffer. Records older than 90 days can be
              archived. Currently showing {clients.length} mailed record{clients.length !== 1 ? "s" : ""}.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
