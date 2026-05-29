import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { markMailed } from "../../actions";

async function getClient(clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      clientState: true,
      zip: true,
      mailPreference: true,
      updatedAt: true,
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
      disputeCases: {
        select: {
          id: true,
          status: true,
          tradelines: {
            where: { bureau: { not: "" } },
            orderBy: { bureau: "asc" },
          },
        },
      },
    },
  });
}

export default async function ClientLettersPage({
  params,
}: {
  params: Promise<{ [key: string]: string }>;
}) {
  const { clientId } = await params;
  const session = await requireSession();
  const role = session.role;
  if (!["MAIL_TEAM", "OWNER", "ADMIN"].includes(role)) {
    redirect("/dashboard");
  }

  const client = await getClient(clientId);
  if (!client) redirect("/dashboard/mail");

  const tenant = client.tenant;
  const mailBalance = tenant.mailTokenAccount
    ? tenant.mailTokenAccount.purchasedBalance - tenant.mailTokenAccount.usedBalance
    : 0;
  const effectiveMailType = client.mailPreference || tenant.defaultMailType || "REGULAR";
  const tokenCost = effectiveMailType === "CERTIFIED" ? 10 : 4;
  const allTradelines = client.disputeCases.flatMap((c) => c.tradelines);

  // Group by bureau
  const byBureau = allTradelines.reduce<Record<string, typeof allTradelines>>((acc, t) => {
    if (!acc[t.bureau]) acc[t.bureau] = [];
    acc[t.bureau].push(t);
    return acc;
  }, {});

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <Link href="/dashboard/mail" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition">
              ← Back to Mail Queue
            </Link>
            <h1 className="text-2xl font-semibold text-white">
              {client.firstName} {client.lastName}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {client.email} · {client.phone || "No phone"} · {allTradelines.length} dispute letter{allTradelines.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-500">Mailing tokens</div>
              <div className={`text-sm font-semibold ${mailBalance < tokenCost ? "text-rose-400" : "text-emerald-400"}`}>
                {mailBalance} available
              </div>
            </div>
            <form action={async () => {
              "use server";
              await markMailed(client.id, tenant.id);
            }}>
              <button
                type="submit"
                className="rounded-full border border-sky-500/30 bg-sky-500/10 px-5 py-2 text-sm font-semibold text-sky-300 transition hover:border-sky-400 hover:bg-sky-500/20"
              >
                Mark as mailed (−{tokenCost})
              </button>
            </form>
          </div>
        </div>

        {/* Letters by bureau */}
        <div className="space-y-10">
          {Object.entries(byBureau).map(([bureau, tradelines]) => (
            <section key={bureau}>
              <div className="mb-4 flex items-center gap-3">
                <div className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                  bureau === "EQUIFAX" ? "border-blue-500/40 bg-blue-500/10 text-blue-300" :
                  bureau === "EXPERIAN" ? "border-green-500/40 bg-green-500/10 text-green-300" :
                  "border-purple-500/40 bg-purple-500/10 text-purple-300"
                }`}>
                  {bureau}
                </div>
                <span className="text-sm text-slate-500">{tradelines.length} letter{tradelines.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="space-y-4">
                {tradelines.map((tradeline) => (
                  <article key={tradeline.id} className="rounded-2xl border border-white/10 bg-[#091426] overflow-hidden">
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                      <div>
                        <span className="font-semibold text-white">{tradeline.furnisherName}</span>
                        <span className="ml-3 text-sm text-slate-400">{tradeline.accountType} · ****{tradeline.accountNumberMasked?.slice(-4) || "0000"} · {(tradeline.balance ?? 0) > 0 ? `$${(tradeline.balance ?? 0).toLocaleString()}` : "$0"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          tradeline.status === "NEW" ? "border border-sky-500/30 bg-sky-500/10 text-sky-300" :
                          "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        }`}>
                          {tradeline.status}
                        </span>
                        <a
                          href={`/dashboard/mail/letters/${client.id}/print?tradelineId=${tradeline.id}`}
                          target="_blank"
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                        >
                          🖨 Print
                        </a>
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400 font-mono">
                        {tradeline.letterText || "No letter text available."}
                      </pre>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
