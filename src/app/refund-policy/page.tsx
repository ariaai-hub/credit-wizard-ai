export default function RefundPolicyPage() {
  return (
    <main className="app-frame text-white">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8 md:px-10 md:py-10">
        {/* Header */}
        <header className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-sky-200/70">
            Refund Policy
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
            Refund Policy
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-slate-300">
            Everything you need to know about cancellations, refunds, and what is eligible for a refund.
          </p>
        </header>

        {/* Sections */}
        <div className="public-surface space-y-6 p-6 md:p-8">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Introduction</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              This Refund Policy applies to all clients using the platform. It outlines when and how you may request a refund for services rendered. By using the platform, you agree to the terms outlined here. If you have any questions, reach out to the support team through your dashboard or via email.
            </p>
          </section>

          <div className="h-px bg-white/10" />

          <section>
            <h2 className="text-lg font-semibold text-white">2. Cancellation</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              You may cancel your subscription at any time directly from your account settings or by contacting the support team. There are no cancellation fees, and you will retain access to the platform until the end of your current billing period. Once cancelled, your subscription will not renew.
            </p>
          </section>

          <div className="h-px bg-white/10" />

          <section>
            <h2 className="text-lg font-semibold text-white">3. Refund Eligibility</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Refund requests are considered on a case-by-case basis. Generally, a refund may be issued if: you were charged incorrectly, there was a technical error on our end, or you requested a cancellation within a reasonable window and meet the conditions outlined here. To be eligible, you must submit a refund request within 30 days of the charge.
            </p>
          </section>

          <div className="h-px bg-white/10" />

          <section>
            <h2 className="text-lg font-semibold text-white">4. How to Request a Refund</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              To request a refund, contact the support team through your dashboard or send an email to{" "}
              <a href="mailto:support@[company-domain].com" className="text-sky-300 underline underline-offset-2">
                support@[company-domain].com
              </a>
              . Please include your account details, the charge in question, and a brief description of the reason for your request. The team will review your request and respond within 3 business days.
            </p>
          </section>

          <div className="h-px bg-white/10" />

          <section>
            <h2 className="text-lg font-semibold text-white">5. Processing Timelines</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Once a refund is approved, it is processed promptly. Depending on your payment provider, funds are typically returned within 5 to 10 business days. You will receive a confirmation once the refund has been issued. If you do not see the funds after 10 business days, contact your payment provider.
            </p>
          </section>

          <div className="h-px bg-white/10" />

          <section>
            <h2 className="text-lg font-semibold text-white">6. Non-Refundable Items</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The following are not eligible for a refund: one-time setup fees, costs already incurred for mail services (such as postage and delivery fees), disputes that have already been processed, and charges outside the 30-day eligibility window. Subscriptions billed before a cancellation request is received are also non-refundable unless otherwise determined by the support team.
            </p>
          </section>

          <div className="h-px bg-white/10" />

          <section>
            <h2 className="text-lg font-semibold text-white">7. Contact Information</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              If you have questions about this policy or need to submit a refund request, contact the support team via your dashboard or email us at{" "}
              <a href="mailto:support@[company-domain].com" className="text-sky-300 underline underline-offset-2">
                support@[company-domain].com
              </a>
              . We aim to respond to all inquiries within 3 business days.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}