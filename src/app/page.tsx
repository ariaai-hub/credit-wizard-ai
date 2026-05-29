import Link from "next/link";

import { PublicSiteNav } from "@/components/public-site-nav";

const promisePoints = [
  "You sell the client.",
  "We handle the fulfillment.",
  "Your agency scales without the usual backend chaos.",
];

const heroSupportRows = [
  "Client onboarding and document follow-up",
  "Dispute workflow and mailed notice handling",
  "Client progress updates and support communication",
];

const featureCards = [
  {
    title: "Onboarding handled",
    body: "Document collection, missing-item follow-up, and early file movement stay organized from day one.",
  },
  {
    title: "Fulfillment handled",
    body: "Dispute workflow, mailing, progress handling, and status visibility live inside one operating system.",
  },
  {
    title: "Client communication handled",
    body: "Clients get updates, progress signals, and next-step visibility without your team babysitting every file.",
  },
];

const clarityRows = [
  "Built specifically for credit repair agencies.",
  "Clients see movement, updates, and progress instead of silence.",
  "Your team stays focused on closing instead of cleaning up fulfillment.",
];

const steps = [
  {
    title: "Sell the client",
    body: "Keep your agency focused on acquisition, closing, and growth.",
  },
  {
    title: "Hand the file off",
    body: "The system takes over the follow-up, fulfillment flow, and status handling.",
  },
  {
    title: "Scale cleaner",
    body: "More clients can move through the business without operations turning into chaos.",
  },
];

export default function Home() {
  return (
    <main className="app-frame text-white">
      <PublicSiteNav />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 md:px-10 md:py-10">
        <header className="lux-panel-strong relative overflow-hidden p-6 md:p-10 text-white">
          <div className="lux-orb lux-orb-one" />
          <div className="lux-orb lux-orb-two" />

          <div className="grid gap-10 xl:grid-cols-[0.88fr_1.12fr] xl:items-center">
            <div className="relative z-10">
              <div className="lux-live-dot">For credit repair agencies</div>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                Credit Repair Agencies: We Handle 100% Of Your Fulfillment
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                Credit Wizard AI gives credit repair agencies the backend that handles onboarding, fulfillment, client updates, and follow-through after the sale.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/sign-up" className="lux-button-primary inline-flex min-h-[3.5rem] flex-col items-center justify-center px-6 py-3 text-center">
                  <span className="text-sm font-semibold leading-none">Sign Up</span>
                  <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-stone-300">7-day trial</span>
                </Link>
                <Link href="/demo" className="lux-button-secondary">
                  View demo
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {promisePoints.map((item) => (
                  <div key={item} className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-sm font-medium leading-7 text-slate-100">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 rounded-[1.7rem] border border-sky-300/16 bg-white/[0.04] p-6 md:p-7">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">What gets handled for your agency</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                Onboarding. Fulfillment. Client updates. Follow-through.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                The point is simple. Your agency should not have to manually chase documents, manage every status update, or keep clients calm one message at a time after the sale.
              </p>

              <div className="mt-6 grid gap-3">
                {heroSupportRows.map((item) => (
                  <div key={item} className="rounded-[1.15rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-sm leading-7 text-slate-100">
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[1.25rem] border border-sky-400/18 bg-sky-400/10 p-5">
                <div className="text-sm font-semibold text-white">What the client feels</div>
                <div className="mt-2 text-sm leading-7 text-sky-100/85">
                  A cleaner service, more visible progress, and far less silence after payment.
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="public-surface p-6 md:p-8">
          <div className="lux-label">What we handle for your agency</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">Everything that usually turns into backend drag.</h2>
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {featureCards.map((card) => (
              <article key={card.title} className="public-surface-soft p-5 md:p-6">
                <div className="text-xl font-semibold tracking-tight text-white">{card.title}</div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <article className="lux-panel-strong p-6 md:p-8">
            <div className="lux-label">How it works</div>
            <h2 className="lux-title mt-4 text-3xl text-white md:text-5xl">You sell. The backend keeps moving.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="public-surface-soft p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-sm font-semibold text-white">{index + 1}</div>
                  <div className="mt-4 text-lg font-semibold text-white">{step.title}</div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{step.body}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="public-surface p-6 md:p-8">
            <div className="lux-label">What should be obvious in five seconds</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">This is agency fulfillment, not another generic CRM.</h2>
            <div className="mt-6 grid gap-3">
              {clarityRows.map((item) => (
                <div key={item} className="public-surface-soft px-4 py-4 text-base leading-8 text-slate-300 shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="lux-panel-strong p-6 md:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">
            <div>
              <div className="lux-label">Next step</div>
              <h2 className="lux-title mt-4 text-3xl text-white md:text-5xl">If you want to sell more and fulfill cleaner, start the trial.</h2>
              <p className="lux-copy mt-4 max-w-3xl text-base">
                Load one live file, review the client experience, and see whether this makes your agency feel tighter after the close.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/pricing" className="lux-button-secondary">
                See pricing
              </Link>
              <Link href="/sign-up" className="lux-button-primary inline-flex min-h-[3.5rem] flex-col items-center justify-center px-6 py-3 text-center">
                <span className="text-sm font-semibold leading-none">Sign Up</span>
                <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-stone-300">7-day trial</span>
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
