import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { CREDIT_REPORT_PROVIDER_OPTIONS } from "@/lib/access";
import { PLAN_DEFINITIONS } from "@/lib/billing";
import { getProviderAffiliateLink } from "@/lib/credit-provider";
import { formatCurrency } from "@/lib/utils";

import { createCompanyAction } from "./actions";

export default function CompanyOnboardingPage() {
  const creditHeroAffiliateLink = getProviderAffiliateLink("CREDIT_HERO");

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12 text-stone-950 md:px-10">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-3xl border border-stone-200 bg-stone-900 p-8 text-stone-50 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
            Company onboarding
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Create a tenant account and issue the first owner login.
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            This is the lean onboarding path for block two. It creates the tenant, owner account,
            trialing subscription record, token account, and first audit events in one move.
          </p>
          <div className="mt-8 space-y-4">
            {PLAN_DEFINITIONS.map((plan) => (
              <div key={plan.key} className="rounded-2xl border border-stone-700 bg-stone-800/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{plan.name}</h2>
                    <p className="mt-1 text-sm text-stone-300">{plan.notes}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold">{formatCurrency(plan.monthlyPrice)}</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-stone-400">per month</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.12em] text-stone-200">
                  <span className="rounded-full border border-stone-600 px-3 py-1">{plan.includedTokens} tokens</span>
                  <span className="rounded-full border border-stone-600 px-3 py-1">{plan.staffSeatLimit} seats</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-sm text-stone-300">
            Already created a company?{" "}
            <Link href="/sign-in" className="font-semibold text-stone-50 underline underline-offset-4">
              Sign in
            </Link>
          </div>
          {creditHeroAffiliateLink ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-50">
              <div className="font-semibold uppercase tracking-[0.14em] text-emerald-200">Credit Hero default signup link</div>
              <p className="mt-2 leading-6 text-emerald-100">
                If this company uses Credit Hero, send each person through this affiliate link.
              </p>
              <a href={creditHeroAffiliateLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold underline underline-offset-4">
                Open Credit Hero signup link
              </a>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <form action={createCompanyAction} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Company name
                <input name="companyName" required className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Plan
                <select name="planKey" defaultValue="growth" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0">
                  {PLAN_DEFINITIONS.map((plan) => (
                    <option key={plan.key} value={plan.key}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Owner name
                <input name="ownerName" required className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Owner email
                <input type="email" name="ownerEmail" required className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Owner phone
                <input name="ownerPhone" required className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Billing email
                <input type="email" name="billingEmail" required className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Company phone
                <input name="companyPhone" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Credit provider
                <select name="creditProvider" defaultValue="CREDIT_HERO" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0">
                  {CREDIT_REPORT_PROVIDER_OPTIONS.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Credit Repair Cloud config ref
                <input name="crcConfigRef" placeholder="crc-account-001" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Credit provider ref
                <input name="creditProviderRef" placeholder="provider-account-001" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Mail queue destination
                <input name="mailQueueDestination" placeholder="#mail-room or internal queue key" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Owner password
                <input type="password" name="password" minLength={10} required className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
              </label>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
              This runs in test mode first. It creates the tenant, first owner login, trialing subscription record,
              included token balance, and audit trail.
            </div>

            <SubmitButton className="inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800" pendingLabel="Creating company...">
              Create company account
            </SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
