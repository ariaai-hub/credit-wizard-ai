import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function getMailedClients(tenantId: string) {
  return prisma.client.findMany({
    where: { tenantId, lifecycleStage: "MAIL_SENT" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      mailPreference: true,
      updatedAt: true,
      tenant: {
        select: {
          name: true,
          mailTokenAccount: {
            select: { purchasedBalance: true, usedBalance: true },
          },
        },
      },
      disputeCases: {
        select: {
          id: true,
          tradelines: {
            where: { bureau: { not: "" } },
            select: {
              id: true,
              bureau: true,
              furnisherName: true,
              accountType: true,
              letterText: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export default async function MailExpensesPage() {
  const session = await requireSession();
  const role = session.role;

  // OWNER and ADMIN only
  if (!["OWNER", "ADMIN"].includes(role)) {
    redirect("/dashboard");
  }

  const tenantId = session.tenantId;
  const clients = await getMailedClients(tenantId);

  // Get token account
  const mailTokenAccount = await prisma.mailTokenAccount.findUnique({
    where: { tenantId },
  });
  const purchasedBalance = mailTokenAccount?.purchasedBalance ?? 0;
  const usedBalance = mailTokenAccount?.usedBalance ?? 0;
  const remainingBalance = purchasedBalance - usedBalance;

  // Group letters by client
  const totalLetters = clients.reduce(
    (sum, c) => sum + c.disputeCases.reduce((s, dc) => s + dc.tradelines.length, 0),
    0,
  );

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header>
          <div className="lux-label">Operations</div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
            Mail Expenses
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Your mailing token balance and history of all items that have been shipped.
          </p>
        </header>

        {/* Token balance cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#091426] p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Purchased tokens</div>
            <div className="mt-3 text-4xl font-semibold text-white">{purchasedBalance}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#091426] p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tokens used</div>
            <div className="mt-3 text-4xl font-semibold text-rose-400">{usedBalance}</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-[#091426] p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Available</div>
            <div className={`mt-3 text-4xl font-semibold ${remainingBalance < 10 ? "text-rose-400" : "text-emerald-400"}`}>
              {remainingBalance}
            </div>
          </div>
        </div>

        {/* Mailed clients */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Shipped letters
              {totalLetters > 0 && (
                <span className="ml-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-sm font-medium text-slate-400">
                  {clients.length} client{clients.length !== 1 ? "s" : ""} · {totalLetters} letter{totalLetters !== 1 ? "s" : ""}
                </span>
              )}
            </h2>
          </div>

          {clients.length === 0 ? (
            <div className="public-surface p-12 text-center">
              <div className="mb-4 text-5xl">📭</div>
              <p className="text-slate-400">No letters have been shipped yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#091426]">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/[0.04]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-400">Client</th>
                    <th className="px-4 py-3 font-semibold text-slate-400">Contact</th>
                    <th className="px-4 py-3 font-semibold text-slate-400">Mail type</th>
                    <th className="px-4 py-3 font-semibold text-slate-400">Letters</th>
                    <th className="px-4 py-3 font-semibold text-slate-400">Shipped</th>
                    <th className="px-4 py-3 font-semibold text-slate-400">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {clients.map((client) => {
                    const allTradelines = client.disputeCases.flatMap((dc) => dc.tradelines);
                    return (
                      <tr key={client.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-white">
                            {client.firstName} {client.lastName}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {client.email || client.phone || "—"}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              client.mailPreference === "CERTIFIED"
                                ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                                : "border border-white/10 bg-white/5 text-slate-300"
                            }`}
                          >
                            {client.mailPreference}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {allTradelines.length} letter{allTradelines.length !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-4 text-slate-500">
                          {new Date(client.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-4">
                          <a
                            href={`/dashboard/mail/letters/${client.id}`}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                          >
                            View letters
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
