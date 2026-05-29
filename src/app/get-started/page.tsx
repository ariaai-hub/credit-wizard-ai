"use client";

import Link from "next/link";
import { useState } from "react";

import { PublicSiteNav } from "@/components/public-site-nav";

const features = [
  {
    title: "Generate letters instantly",
    body: "Upload your credit report and our AI builds every dispute letter you need — written and formatted for each bureau and item.",
  },
  {
    title: "Download & mail yourself",
    body: "No middlemen. Download your letters, print them, and mail directly to the bureaus. You stay in full control of your credit journey.",
  },
  {
    title: "Track your progress",
    body: "Log your disputes and monitor your credit profile as items get updated or removed. Know exactly where you stand at all times.",
  },
];

const faqs = [
  {
    q: "How does the letter generation work?",
    a: "After uploading your credit report, our AI analyzes each negative item and generates a structured dispute letter tailored to that specific item and bureau. You download them as PDFs, ready to print and mail.",
  },
  {
    q: "Do I need to mail the letters myself?",
    a: "Yes — that's by design. The letters are formatted to meet legal requirements for direct mail delivery to Equifax, Experian, and TransUnion. You mail them yourself, which means you avoid paying a company to do it for you.",
  },
  {
    q: "Will this guarantee items removed from my credit report?",
    a: "We can't guarantee outcomes — no legitimate credit repair service can. What we do is generate well-structured, legally compliant dispute letters and give you the tools to track your progress. The bureaus are required to investigate within 30 days.",
  },
  {
    q: "What's the difference between Starter, Pro, and Elite?",
    a: "Starter gives you unlimited letter generation so you can dispute everything on your report. Pro adds advanced strategy tools, priority processing, and detailed dispute tracking. Elite adds everything in Pro plus a dedicated credit specialist review of your report and a custom action plan.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. Monthly plans cancel at the end of your billing cycle. No long-term contracts, no cancellation fees.",
  },
  {
    q: "Is my credit report data secure?",
    a: "Your report is processed and stored with encryption. We do not sell or share your personal data with third parties. You can delete your data at any time from your account settings.",
  },
];

export default function GetStartedPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="app-frame text-white">
      <PublicSiteNav />

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 md:py-16">
        <header className="lux-panel-strong relative overflow-hidden p-6 md:p-12 text-white">
          <div className="lux-orb lux-orb-one" />
          <div className="lux-orb lux-orb-two" />
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl lg:text-7xl">
              Stop paying credit repair companies to do nothing.
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-base leading-8 text-slate-300 md:text-lg">
              You upload your report. We generate every dispute letter. You download and mail them yourself — for a fraction of what they charge.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="#pricing"
                className="lux-button-primary inline-flex min-h-[3.5rem] flex-col items-center justify-center px-6 py-3 text-center"
              >
                <span className="text-sm font-semibold leading-none">Start for $9.99</span>
                <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-stone-300">No long-term contract</span>
              </Link>
              <Link href="#features" className="lux-button-secondary">
                See how it works
              </Link>
            </div>
          </div>
        </header>

        {/* Feature Grid */}
        <section id="features" className="public-surface p-6 md:p-8">
          <div className="lux-label">How it works</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Three steps. No middlemen.
          </h2>
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {features.map((f) => (
              <article key={f.title} className="public-surface-soft p-5 md:p-6">
                <div className="text-xl font-semibold tracking-tight text-white">{f.title}</div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Social Proof */}
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8 text-center">
          <div className="text-5xl font-semibold tracking-tight text-white md:text-6xl">12,400+</div>
          <p className="mt-3 text-base text-slate-300">
            members who have taken control of their credit
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              No credit card required to start
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Cancel anytime
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Letters ready in minutes
            </span>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="public-surface p-6 md:p-8">
          <div className="lux-label">Pricing</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Choose your plan
          </h2>
          <p className="mt-3 text-base text-slate-300">
            All plans include unlimited letter generation. No hidden fees.
          </p>

          <div className="mt-8 grid gap-5 xl:grid-cols-3">
            {/* Starter */}
            <div className="rounded-[1.6rem] border border-blue-400/25 bg-gradient-to-b from-blue-500/10 to-transparent p-6 md:p-7">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Starter</div>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-semibold tracking-tight text-white">$9.99</span>
                <span className="mb-1 text-sm text-slate-400">/month</span>
              </div>
              <p className="mt-3 text-sm text-slate-300">Essential access to dispute letter generation and tracking.</p>
              <ul className="mt-5 space-y-3">
                {[
                  "Unlimited dispute letter generation",
                  "Equifax, Experian & TransUnion support",
                  "Download as print-ready PDF",
                  "Basic dispute tracking",
                  "Email support",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-200">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up?plan=starter"
                className="mt-6 flex h-11 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Get started
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-[1.6rem] border border-emerald-400/25 bg-gradient-to-b from-emerald-500/10 to-transparent p-6 md:p-7">
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Pro</div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">Most popular</span>
              </div>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-semibold tracking-tight text-white">$59.99</span>
                <span className="mb-1 text-sm text-slate-400">/month</span>
              </div>
              <p className="mt-3 text-sm text-slate-300">Advanced strategy, priority generation, and full progress tracking.</p>
              <ul className="mt-5 space-y-3">
                {[
                  "Everything in Starter",
                  "Advanced dispute strategy tools",
                  "Priority letter generation",
                  "Full progress & milestone tracking",
                  "Dispute outcome logging",
                  "Priority email & chat support",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-200">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up?plan=pro"
                className="mt-6 flex h-11 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Get started
              </Link>
            </div>

            {/* Elite */}
            <div className="rounded-[1.6rem] border border-amber-400/25 bg-gradient-to-b from-amber-500/10 to-transparent p-6 md:p-7">
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Elite</div>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">Best value</span>
              </div>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-semibold tracking-tight text-white">$129.99</span>
                <span className="mb-1 text-sm text-slate-400">/month</span>
              </div>
              <p className="mt-3 text-sm text-slate-300">Specialist report review and a personalized credit action plan.</p>
              <ul className="mt-5 space-y-3">
                {[
                  "Everything in Pro",
                  "Dedicated credit specialist report review",
                  "Personalized action plan",
                  "Quarterly strategy call (30 min)",
                  "Escalated priority support",
                  "Advanced credit analysis dashboard",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-200">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up?plan=elite"
                className="mt-6 flex h-11 items-center justify-center rounded-full bg-amber-600 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                Get started
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="public-surface p-6 md:p-8">
          <div className="lux-label">FAQ</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Questions you might have
          </h2>
          <div className="mt-6 space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] overflow-hidden">
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-medium text-white">{faq.q}</span>
                  <svg
                    className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm leading-7 text-slate-300">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="lux-panel-strong p-6 md:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Ready to take control of your credit?
              </h2>
              <p className="mt-4 max-w-2xl text-base text-slate-300">
                Start with Starter for $9.99/month. No long-term contracts. Cancel anytime.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="#pricing"
                className="lux-button-primary inline-flex min-h-[3.5rem] flex-col items-center justify-center px-6 py-3 text-center"
              >
                <span className="text-sm font-semibold leading-none">Start your membership</span>
                <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-stone-300">$9.99/month</span>
              </Link>
              <Link href="/sign-in" className="lux-button-secondary">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}