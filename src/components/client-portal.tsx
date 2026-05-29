"use client";

import { AnimatedCount } from "@/components/animated-count";
import type { ClientPortalViewModel } from "@/lib/client-portal";

type ClientPortalProps = {
  model: ClientPortalViewModel;
  previewLabel?: string;
};

export function ClientPortal({ model, previewLabel }: ClientPortalProps) {
  return (
    <main className="app-frame px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10 text-white">
      <div className="mx-auto max-w-6xl grid gap-6">
        {/* Header — matches dashboard public-surface */}
        <header className="public-surface p-5 sm:p-8 lg:p-10">
          <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr] xl:gap-8">
            <div>
              <div className="inline-flex items-center rounded-full border border-sky-200/30 bg-sky-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                {previewLabel ?? "Client portal"}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {model.statusChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {/* Welcome video */}
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <video
                  src="/welcome-portal.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full max-w-2xl rounded-2xl"
                  style={{ maxHeight: "280px" }}
                />
              </div>

              <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-5xl text-white">
                Your file is active and moving.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                See what is complete, what is still missing, how many disputes have been sent, what has been
                deleted, and what happens next, all in one place.
              </p>

              <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200/70">
                      Next step
                    </div>
                    <div className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                      {model.nextStepTitle}
                    </div>
                    <p className="mt-3 max-w-2xl text-base leading-8 text-slate-300">{model.nextStepBody}</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200">
                    {model.progressLabel}
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500" style={{ width: `${model.progressPercent}%` }} />
                </div>
                <div className="mt-3 text-sm font-medium text-slate-300">{model.onboardingSummaryLabel}</div>
              </div>
            </div>

            <aside className="grid gap-4 self-start">
              {/* Welcome back card — matches public-surface */}
              <div className="public-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200/70">
                      Welcome back
                    </div>
                    <div className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      {model.firstName}
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    {model.supportStatusLabel}
                  </span>
                </div>
                <div className="mt-6 grid gap-4 text-[15px] text-slate-300">
                  <div className="flex items-center justify-between gap-4">
                    <span>Client</span>
                    <span className="font-medium text-white">{model.clientName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Started</span>
                    <span className="font-medium text-white">{model.createdAtLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Last updated</span>
                    <span className="font-medium text-white">{model.updatedAtLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Provider</span>
                    <span className="font-medium text-white">{model.providerName}</span>
                  </div>
                </div>
              </div>

              {/* Need help card */}
              <div className="public-surface p-5 sm:p-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200/70">
                  Need help?
                </div>
                <div className="mt-3 text-xl font-semibold text-white">Message support</div>
                <p className="mt-2 text-base leading-8 text-slate-300">
                  Ask a question, respond to a document request, or get a status update without waiting on a
                  phone call.
                </p>
                <div className="mt-4 grid gap-3">
                  <button
                    onClick={() => window.dispatchEvent(new Event("open-chat-widget"))}
                    className="lux-button-primary"
                  >
                    Message support
                  </button>
                  <a
                    href="#send-document"
                    className="lux-button-secondary"
                  >
                    Upload documents
                  </a>
                  {model.providerSignupUrl ? (
                    <a
                      href={model.providerSignupUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="lux-button-ghost"
                    >
                      Complete provider signup
                    </a>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </header>

        {/* Stats row */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="public-surface p-5 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200/70">
              Disputes sent
            </div>
            <div className="mt-2 text-4xl font-semibold text-white">
              <AnimatedCount value={model.submittedDisputeCount} />
            </div>
          </article>
          <article className="public-surface p-5 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200/70">
              Items deleted
            </div>
            <div className="mt-2 text-4xl font-semibold text-white">
              <AnimatedCount value={model.deletionCount} />
            </div>
          </article>
          <article className="public-surface p-5 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200/70">
              Negative items
            </div>
            <div className="mt-2 text-4xl font-semibold text-white">
              <AnimatedCount value={model.negativeItemCount} />
            </div>
          </article>
          <article className="public-surface p-5 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200/70">
              Documents received
            </div>
            <div className="mt-2 text-4xl font-semibold text-white">
              <AnimatedCount value={model.documentCount} />
              <span className="text-2xl text-slate-400">/{model.requiredDocumentCount}</span>
            </div>
          </article>
          <article className="public-surface p-5 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200/70">
              Funding readiness
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {model.fundingLane.readinessLabel}
            </div>
          </article>
        </section>

        {/* Bottom two-column section */}
        <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
          {/* Onboarding checklist */}
          <article className="public-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200/70">
                  Onboarding status
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  Complete the items that keep your file moving
                </h2>
              </div>
              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  model.missingItemCount === 0
                    ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                    : "border border-rose-500/25 bg-rose-500/10 text-rose-200"
                }`}
              >
                {model.missingItemCount === 0
                  ? "All core items complete"
                  : `${model.missingItemCount} item${model.missingItemCount === 1 ? "" : "s"} still missing`}
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {model.checklist.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-[1.4rem] border p-4 ${
                    item.complete
                      ? "border-emerald-500/25 bg-emerald-500/10"
                      : "border-rose-500/25 bg-rose-500/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        item.complete ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      }`}
                    >
                      {item.complete ? "✓" : "!"}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-white">{item.label}</div>
                      <div className="mt-1 text-sm font-medium text-slate-300">
                        {item.complete ? "Complete" : "Missing, needed to move forward"}
                      </div>
                      <div className="mt-2 text-base leading-8 text-slate-400">{item.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Funding card */}
          <div className="grid gap-6">
            <article id="funding" className="public-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200/70">
                    Funding readiness
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    {model.fundingLane.title}
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                  {model.fundingLane.badge}
                </span>
              </div>
              <p className="mt-4 text-base leading-8 text-slate-300">{model.fundingLane.detail}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Readiness
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {model.fundingLane.readinessLabel}
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    What changes this
                  </div>
                  <div className="mt-2 text-base leading-8 text-slate-300">
                    More dispute movement, better results, and clean onboarding completion push the file
                    closer to review.
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}