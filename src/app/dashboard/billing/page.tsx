import { CheckoutButton } from "@/components/checkout-button";
import { PortalButton } from "@/components/portal-button";
import { MAIL_CHARGE_RULES, PLAN_DEFINITIONS, TOKEN_PACKS } from "@/lib/billing";
import { formatCurrency } from "@/lib/utils";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

function readValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function getTokenBalance(tenantId: string) {
  const account = await prisma.mailTokenAccount.findUnique({ where: { tenantId } });
  if (!account) return { included: 0, purchased: 0, used: 0, available: 0 };
  const available = account.includedBalance + account.purchasedBalance - account.usedBalance;
  return {
    included: account.includedBalance,
    purchased: account.purchasedBalance,
    used: account.usedBalance,
    available,
  };
}

async function getQueuedMailCount(tenantId: string) {
  return prisma.client.count({ where: { tenantId, lifecycleStage: "MAIL_QUEUED" } });
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const portalError = readValue(resolvedSearchParams.portalError);
  const setupStatus = readValue(resolvedSearchParams.setup);

  const [tokenBal, queuedCount] = await Promise.all([
    getTokenBalance(session.tenantId),
    getQueuedMailCount(session.tenantId),
  ]);

  const queuedCost = queuedCount * MAIL_CHARGE_RULES.CERTIFIED_MAIL; // worst case
  const isLow = tokenBal.available < queuedCount;
  const isEmpty = tokenBal.available === 0;

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="public-surface p-8 md:p-10">
          <div className="lux-label">Billing</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Plans, tokens, and payment settings</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
            Choose the plan that fits your company, buy extra tokens when needed, and manage your payment method.
          </p>
        </header>

        {/* Token balance + top-up alert */}
        <section className="grid gap-4 md:grid-cols-2">
          {/* Balance card */}
          <div className="public-surface p-6">
            <div className="lux-label">Mailing tokens</div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className={`text-5xl font-semibold ${isEmpty ? "text-rose-400" : isLow ? "text-amber-400" : "text-white"}`}>
                {tokenBal.available}
              </span>
              <span className="text-slate-400">available</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">Included</div>
                <div className="mt-1 font-semibold text-emerald-400">{tokenBal.included}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Purchased</div>
                <div className="mt-1 font-semibold text-white">{tokenBal.purchased}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Used</div>
                <div className="mt-1 font-semibold text-slate-400">{tokenBal.used}</div>
              </div>
            </div>
          </div>

          {/* Top-up / urgency card */}
          {isLow ? (
            <div className="public-surface p-6">
              <div className="flex items-center gap-2">
                <span className={`mt-0.5 text-xl ${isEmpty ? "text-rose-400" : "text-amber-400"}`}>⚠️</span>
                <div className="lux-label text-rose-300">{isEmpty ? "Out of tokens" : "Tokens running low"}</div>
              </div>
              <p className="mt-3 text-sm text-slate-300">
                {queuedCount > 0 ? (
                  <>
                    You have <strong className="text-white">{queuedCount} letter{queuedCount !== 1 ? "s" : ""}</strong> waiting in your mail queue.
                    {isEmpty
                      ? " Add tokens now to ship them."
                      : ` You have ${tokenBal.available} tokens — each certified letter costs ${MAIL_CHARGE_RULES.CERTIFIED_MAIL} tokens.`}
                  </>
                ) : (
                  "Your token balance is running low. Add more before your next mailing."
                )}
              </p>
              <div className="mt-5">
                <CheckoutButton label="Top Up Tokens" payload={{ tokenPack: "100" as "100" | "300" | "1000" }} />
              </div>
            </div>
          ) : (
            <div className="public-surface flex flex-col items-center justify-center p-6 text-center">
              <span className="text-4xl text-emerald-400">✓</span>
              <div className="mt-3 text-lg font-semibold text-white">Tokens available</div>
              <p className="mt-2 text-sm text-slate-400">
                {queuedCount > 0
                  ? `${queuedCount} letter${queuedCount !== 1 ? "s" : ""} in your mail queue ready to ship.`
                  : "Your mailing tokens are ready. Add clients to get started."}
              </p>
            </div>
          )}
        </section>

        {/* Mail queue alert when tokens are low */}
        {isLow && queuedCount > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 text-xl text-amber-400">📬</span>
              <div>
                <div className="font-semibold text-amber-300">
                  {isEmpty
                    ? "No tokens — mail is blocked"
                    : "Tokens low — mail may be delayed"}
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  {isEmpty
                    ? "Your mail queue has letters waiting but your token balance is empty. Add tokens to unblock them. The follow-up team will contact you shortly if you don't top up."
                    : `You have ${tokenBal.available} tokens but ${queuedCount} certified letters need ${queuedCost} tokens. Top up to ship immediately.`}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <CheckoutButton label="Top Up Now" payload={{ tokenPack: "100" as "100" | "300" | "1000" }} variant="secondary" />
                  <Link
                    href="/dashboard/mail"
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    View Mail Queue →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="public-surface p-6 md:p-8">
            <div className="lux-label">Subscription plans</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Pick your plan</h2>
            <div className="mt-6 space-y-4">
              {PLAN_DEFINITIONS.map((plan) => (
                <div key={plan.key} className="public-surface-soft p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-xl font-semibold text-white">{plan.name}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-300">
                        {plan.includedTokens} included tokens, {plan.staffSeatLimit} staff seats
                      </div>
                    </div>
                    <div className="text-2xl font-semibold text-white">{formatCurrency(plan.monthlyPrice)}</div>
                  </div>
                  <div className="mt-4">
                    <CheckoutButton label={`Start ${plan.name}`} payload={{ planKey: plan.key }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="public-surface p-6 md:p-8">
            <div className="lux-label">Add-ons</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Token packs</h2>
            <div className="mt-6 space-y-4">
              {TOKEN_PACKS.map((pack) => (
                <div key={pack.name} className="public-surface-soft flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-white">{pack.name}</div>
                    <div className="mt-2 text-sm text-slate-300">
                      Extra tokens beyond your plan's included balance.
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <div className="text-xl font-semibold text-white">{formatCurrency(pack.price)}</div>
                    <CheckoutButton label="Buy pack" payload={{ tokenPack: String(pack.tokens) as "100" | "300" | "1000" }} variant="secondary" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 public-surface-soft p-5 text-sm leading-7 text-slate-300">
              <div>
                Regular mail: <span className="font-semibold text-white">{formatCurrency(MAIL_CHARGE_RULES.REGULAR_MAIL)}</span> per letter
              </div>
              <div>
                Certified mail: <span className="font-semibold text-white">{formatCurrency(MAIL_CHARGE_RULES.CERTIFIED_MAIL)}</span> per letter
              </div>
              <div className="mt-2 text-slate-500">
                Tokens are deducted when you mark a letter as mailed. Add more anytime.
              </div>
            </div>
          </article>
        </section>

        <section className="public-surface p-6 md:p-8">
          {portalError ? (
            <div className="mb-5 rounded-[1.2rem] border border-rose-400/25 bg-rose-500/10 px-4 py-4 text-sm leading-7 text-rose-100">
              {portalError}
            </div>
          ) : null}
          {setupStatus === "success" ? (
            <div className="mb-5 rounded-[1.2rem] border border-sky-400/25 bg-sky-500/10 px-4 py-4 text-sm leading-7 text-sky-100">
              Payment method updated.
            </div>
          ) : null}
          {setupStatus === "cancelled" ? (
            <div className="mb-5 rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-7 text-slate-200">
              Payment method update was cancelled.
            </div>
          ) : null}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="lux-label">Payment settings</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Manage payment method</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">Open Stripe to update the card on file and related billing details.</p>
            </div>
            <PortalButton />
          </div>
        </section>
      </div>
    </main>
  );
}
