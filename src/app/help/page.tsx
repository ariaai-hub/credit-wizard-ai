"use client";

import { useState } from "react";

const categories = [
  {
    icon: "🚀",
    title: "Getting Started",
    description: "Onboarding guides, account setup, and your first steps on the platform.",
    href: "#",
  },
  {
    icon: "📋",
    title: "Disputes & Reports",
    description: "How to file disputes, read reports, and track the progress of your credit files.",
    href: "#",
  },
  {
    icon: "📬",
    title: "Mail & Tracking",
    description: "Understanding mail costs, tracking numbers, and delivery timelines.",
    href: "#",
  },
  {
    icon: "📈",
    title: "Funding & Scores",
    description: "What drives your credit score, how funding works, and what to expect.",
    href: "#",
  },
  {
    icon: "🔐",
    title: "Account & Portal",
    description: "Managing your account, billing, team seats, and portal access.",
    href: "#",
  },
];

const faqs = [
  {
    q: "How do I get started on the platform?",
    a: "After signing up, complete your profile and invite your team if needed. From there, you can start adding clients and generating disputes right away. The Getting Started guide in this Help Center walks you through each step.",
  },
  {
    q: "How are dispute actions counted?",
    a: "Each dispute action — such as generating a letter or filing a report — consumes tokens from your monthly allocation. Your current token usage is visible in the dashboard at any time.",
  },
  {
    q: "What are the mail costs?",
    a: "Standard mail is billed at $1.19 and certified mail at $5.49. These charges are separate from your subscription and appear on your monthly invoice. All mail is tracked and you will receive a tracking number for each item sent.",
  },
  {
    q: "How long does it take to see credit score changes?",
    a: "Credit bureaus typically take 30 to 45 days to respond to disputes. Score changes depend on the bureau and the creditor's response. Check your dashboard for dispute status updates and any bureau responses as they come in.",
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes. You can cancel your subscription at any time from your account settings with no cancellation fees. You will retain access until the end of your current billing period.",
  },
  {
    q: "How do I add a team member?",
    a: "Navigate to your account settings and select Team or Seats. From there, you can invite new users by email and assign them a role. Each plan includes a set number of seats.",
  },
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <main className="app-frame text-white">
      {/* Hero search */}
      <header className="public-surface mx-auto w-full max-w-3xl p-8 text-center md:p-10">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
          How can we help?
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-slate-300">
          Browse the categories below or expand a question to find your answer.
        </p>
        <div className="public-input mx-auto mt-6 flex items-center gap-3 overflow-hidden px-4 py-3 text-left max-w-lg">
          <svg
            className="h-5 w-5 shrink-0 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search for answers…"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-slate-400 outline-none"
          />
        </div>
      </header>

      {/* Category grid */}
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8 md:px-10">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {categories.map((cat) => (
            <a
              key={cat.title}
              href={cat.href}
              className="public-surface flex flex-col gap-4 rounded-2xl p-6"
            >
              <span className="text-3xl">{cat.icon}</span>
              <div>
                <div className="text-lg font-semibold text-white">{cat.title}</div>
                <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{cat.description}</p>
              </div>
            </a>
          ))}
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="public-surface overflow-hidden rounded-xl">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-sm font-medium text-white">{faq.q}</span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {openIndex === i && (
                  <div className="border-t border-white/10 px-5 pb-5 pt-4">
                    <p className="text-sm leading-7 text-slate-300">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Still need help */}
        <div className="public-surface flex flex-col items-center gap-4 rounded-2xl p-8 text-center md:p-10">
          <div className="text-2xl">💬</div>
          <h2 className="text-lg font-semibold text-white">Still need help?</h2>
          <p className="max-w-sm text-sm text-slate-300 leading-relaxed">
            Our support team is available through the dashboard chat. Send a message and we will get back to you as soon as possible.
          </p>
          <a
            href="/dashboard"
            className="lux-button-primary inline-flex min-h-[3rem] items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
          >
            Contact Support
          </a>
        </div>
      </section>
    </main>
  );
}