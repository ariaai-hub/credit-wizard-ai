import Link from "next/link";

import { PublicSiteNav } from "@/components/public-site-nav";
import { MAIL_CHARGE_RULES, PLAN_DEFINITIONS, TOKEN_ACTION_COSTS } from "@/lib/billing";
import { formatCurrency } from "@/lib/utils";

function getPlanFit(index: number) {
  if (index === 0) return "For smaller companies building consistent monthly volume.";
  if (index === 1) return "For teams that need more delivery capacity each week.";
  return "For higher-volume companies running a larger client book.";
}

function getApproxDisputeCapacity(tokens: number) {
  return Math.floor(tokens / TOKEN_ACTION_COSTS.LETTER_GENERATION);
}

const pricingModel = [
  {
    title: "Monthly subscription",
    body: "Plans include staff seats and monthly capacity.",
  },
  {
    title: "$5 dispute usage",
    body: "Dispute activity is billed at $5 per dispute.",
  },
  {
    title: "Mail billed separately",
    body: `Standard mail ${formatCurrency(MAIL_CHARGE_RULES.REGULAR_MAIL)} and priority mail ${formatCurrency(MAIL_CHARGE_RULES.CERTIFIED_MAIL)} stay outside usage so fulfillment remains transparent.`,
  },
  {
    title: "Flexible entry",
    body: "Start on the Starter trial or begin paid service immediately.",
  },
];

export default function PricingPage() {
  return (
    <main className="app-frame text-white">
      <PublicSiteNav />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 md:px-10 md:py-10">
        <header className="lux-panel-strong relative overflow-hidden p-6 md:p-10 text-white">
          <div className="lux-orb lux-orb-one" />
          <div className="max-w-4xl">
            <div className="lux-live-dot">Pricing</div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
              Clear pricing for teams, volume, and delivery.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">
              Monthly price, seat count, included capacity, and dispute pricing are visible up front.
            </p>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-3">
          {PLAN_DEFINITIONS.map((plan, index) => {
            const approximateDisputes = getApproxDisputeCapacity(plan.includedTokens);
            return (
              <article key={plan.key} className="public-surface p-6 md:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-2xl font-semibold text-white">{plan.name}</div>
                    <p className="mt-2 text-base leading-8 text-slate-300">{getPlanFit(index)}</p>
                  </div>
                  <span className="lux-pill">{plan.staffSeatLimit} seats</span>
                </div>

                <div className="mt-6 text-4xl font-semibold text-white">{formatCurrency(plan.monthlyPrice)}</div>
                <div className="mt-1 text-sm text-slate-400">per month</div>

                <div className="mt-6 grid gap-3 text-base leading-8 text-slate-300">
                  <div className="public-surface-soft p-4">
                    Included monthly tokens: <span className="font-semibold text-white">{plan.includedTokens}</span>
                  </div>
                  <div className="public-surface-soft p-4">
                    Approximate dispute actions: <span className="font-semibold text-white">{approximateDisputes}</span>
                  </div>
                  <div className="public-surface-soft p-4">
                    Dispute usage: <span className="font-semibold text-white">{formatCurrency(TOKEN_ACTION_COSTS.LETTER_GENERATION)} each</span>
                  </div>
                  <div className="public-surface-soft p-4">{plan.notes}</div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <Link href="/sign-up" className="lux-button-primary inline-flex min-h-[4.25rem] w-full flex-col items-center justify-center rounded-[1.25rem] px-6 py-4 text-center">
                    <span className="text-sm font-semibold">Sign Up</span>
                    <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-stone-300">7-day trial</span>
                  </Link>
                  <Link href="/sign-up" className="lux-button-secondary w-full text-center">
                    Start paid now
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pricingModel.map((item) => (
            <article key={item.title} className="public-surface p-5">
              <div className="text-sm font-semibold text-white">{item.title}</div>
              <div className="mt-3 text-base leading-8 text-slate-300">{item.body}</div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
