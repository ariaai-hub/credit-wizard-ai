import Link from "next/link";

const previewQueue = [
  {
    name: "Jasmine Carter",
    contact: "jasmine@example.com",
    status: "signup sent",
    followUp: "24h reminder",
    channel: "sms",
    nextTouch: "Today, 2:00 PM",
  },
  {
    name: "Marcus Hill",
    contact: "+1 (404) 555-0128",
    status: "signup link ready",
    followUp: "initial send",
    channel: "sms",
    nextTouch: "Now",
  },
  {
    name: "Danielle Brooks",
    contact: "danielle@example.com",
    status: "signup sent",
    followUp: "72h reminder",
    channel: "email",
    nextTouch: "Tomorrow, 10:30 AM",
  },
  {
    name: "Terrence Reed",
    contact: "+1 (678) 555-0184",
    status: "failed",
    followUp: "fix needed",
    channel: "manual",
    nextTouch: "No further touch scheduled",
  },
];

const recentRuns = [
  {
    event: "follow-up run completed",
    tone: "lux-ok",
    createdAt: "Today, 3:18 PM",
    mode: "Live run",
    trigger: "dashboard manual",
    actor: "Shomari Akhdar",
    dueCount: 3,
    resultCount: 3,
    breakdown: ["sent: 2", "skipped: 1"],
  },
  {
    event: "follow-up run completed",
    tone: "lux-ok",
    createdAt: "Today, 2:42 PM",
    mode: "Dry run",
    trigger: "dashboard manual",
    actor: "Shomari Akhdar",
    dueCount: 3,
    resultCount: 3,
    breakdown: ["dry_run: 3"],
  },
  {
    event: "follow-up run started",
    tone: "lux-warn",
    createdAt: "Today, 2:41 PM",
    mode: "Dry run",
    trigger: "dashboard manual",
    actor: "Shomari Akhdar",
    dueCount: null,
    resultCount: null,
    breakdown: [],
  },
];

const readinessItems = [
  { label: "SMTP email", ready: true, detail: "Configured for delivery" },
  { label: "Twilio SMS", ready: true, detail: "Configured for delivery" },
  { label: "Automation auth", ready: true, detail: "Secret is configured" },
];

const cadence = [
  { label: "Initial send", detail: "Client receives the first push immediately." },
  { label: "24h reminder", detail: "First reminder if signup has not been completed." },
  { label: "72h reminder", detail: "Second reminder with stronger urgency." },
  { label: "7d final follow-up", detail: "Final automated push before manual intervention." },
];

export default function AutomationPreviewPage() {
  return (
    <main className="app-frame px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <div className="lux-shell">
        <header className="lux-hero p-5 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <div className="lux-label">Preview</div>
              <h1 className="lux-title mt-4 text-3xl text-stone-950 sm:text-5xl">Automation center, redesigned for a premium operator view</h1>
              <p className="lux-copy mt-4 text-sm sm:text-base">
                Clear queue pressure, immediate run controls, visible transport readiness, and a history trail that tells you exactly what fired.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/sign-in" className="lux-button-secondary">
                Open sign-in
              </Link>
              <span className="lux-pill">Credit Hero linked</span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
          <article className="lux-metric">
            <div className="text-sm text-stone-500">Clients due now</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">3</div>
            <p className="mt-2 text-sm text-stone-600">Current signup follow-up workload.</p>
          </article>
          <article className="lux-metric">
            <div className="text-sm text-stone-500">SMS recommended</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">2</div>
            <p className="mt-2 text-sm text-stone-600">Fastest lane for immediate contact.</p>
          </article>
          <article className="lux-metric">
            <div className="text-sm text-stone-500">Email recommended</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">1</div>
            <p className="mt-2 text-sm text-stone-600">Fallback when SMS is not ideal.</p>
          </article>
          <article className="lux-dark p-6">
            <div className="text-sm text-stone-400">Provider link</div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-white">Credit Hero</div>
            <p className="mt-2 text-sm text-stone-300">Affiliate signup link is loaded and ready for outbound.</p>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="lux-panel-strong p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="lux-label">Run controls</div>
                <h2 className="lux-title mt-3 text-2xl text-stone-950">Command view</h2>
                <p className="lux-copy mt-2 text-sm">Inspect safely first, then launch the live automation batch.</p>
              </div>
              <span className="lux-pill">Manual control</span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <article className="lux-list-card">
                <div className="lux-label">Safe test</div>
                <div className="mt-2 text-xl font-semibold text-stone-950">Run dry run</div>
                <p className="mt-2 text-sm text-stone-600">Simulates queue movement without sending email or SMS.</p>
                <div className="mt-4">
                  <div className="lux-button-secondary w-full">Start dry run</div>
                </div>
              </article>

              <article className="lux-dark p-5">
                <div className="lux-label !text-stone-400">Production action</div>
                <div className="mt-2 text-xl font-semibold text-white">Run live follow-ups</div>
                <p className="mt-2 text-sm text-stone-300">Sends the due reminders now using the recommended channel.</p>
                <div className="mt-4">
                  <div className="lux-button-secondary w-full !bg-white !text-stone-950">Start live run</div>
                </div>
              </article>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="lux-list-card">
                <div className="lux-label">Last completed run</div>
                <div className="mt-2 text-lg font-semibold text-stone-950">Today, 3:18 PM</div>
                <div className="mt-1 text-sm text-stone-600">Live run via dashboard manual</div>
              </div>
              <div className="lux-list-card">
                <div className="lux-label">Last live run</div>
                <div className="mt-2 text-lg font-semibold text-stone-950">Today, 3:18 PM</div>
                <div className="mt-1 text-sm text-stone-600">3 due items, 3 results</div>
              </div>
            </div>
          </article>

          <article className="lux-panel-strong p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="lux-label">Recent runs</div>
                <h2 className="lux-title mt-3 text-2xl text-stone-950">What actually fired</h2>
              </div>
              <span className="lux-pill">Last 12 events</span>
            </div>

            <div className="mt-6 grid gap-3">
              {recentRuns.map((run) => (
                <article key={`${run.event}-${run.createdAt}`} className={`lux-list-card ${run.tone}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="lux-pill">{run.event}</div>
                      <div className="mt-3 text-sm font-semibold text-stone-950">{run.createdAt}</div>
                      <div className="mt-1 text-sm text-stone-600">{run.mode} via {run.trigger}</div>
                    </div>
                    <div className="text-sm text-stone-600">Actor: <span className="font-medium text-stone-900">{run.actor}</span></div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="lux-label">Due count</div>
                      <div className="mt-1 font-semibold text-stone-950">{run.dueCount ?? "-"}</div>
                    </div>
                    <div>
                      <div className="lux-label">Result count</div>
                      <div className="mt-1 font-semibold text-stone-950">{run.resultCount ?? "-"}</div>
                    </div>
                    <div>
                      <div className="lux-label">Status mix</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {run.breakdown.length === 0 ? <span className="text-stone-500">-</span> : run.breakdown.map((item) => <span key={item} className="lux-pill">{item}</span>)}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="lux-panel-strong p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="lux-label">Live queue</div>
                <h2 className="lux-title mt-3 text-2xl text-stone-950">Follow-up workload</h2>
                <p className="lux-copy mt-2 text-sm">Every queued client, next touch, and recommended channel.</p>
              </div>
              <span className="lux-pill">/api/automation/provider-signup-followups</span>
            </div>

            <div className="mt-6 grid gap-3">
              {previewQueue.map((item) => (
                <article key={item.name} className="lux-list-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-stone-950">{item.name}</div>
                      <div className="mt-1 text-sm text-stone-500">{item.contact}</div>
                    </div>
                    <span className="lux-pill">{item.channel}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="lux-label">Status</div>
                      <div className="mt-1 font-medium text-stone-900">{item.status}</div>
                    </div>
                    <div>
                      <div className="lux-label">Follow-up</div>
                      <div className="mt-1 font-medium text-stone-900">{item.followUp}</div>
                    </div>
                    <div>
                      <div className="lux-label">Next touch</div>
                      <div className="mt-1 font-medium text-stone-900">{item.nextTouch}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <div className="grid gap-6">
            <article className="lux-panel-strong p-5 sm:p-6">
              <div className="lux-label">Transport readiness</div>
              <h2 className="lux-title mt-3 text-2xl text-stone-950">System status</h2>
              <div className="mt-5 grid gap-3">
                {readinessItems.map((item) => (
                  <div key={item.label} className={`lux-list-card ${item.ready ? "lux-ok" : "lux-bad"}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-stone-950">{item.label}</div>
                        <div className="mt-1 text-sm text-stone-600">{item.detail}</div>
                      </div>
                      <span className="lux-pill">{item.ready ? "ready" : "blocked"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="lux-panel-strong p-5 sm:p-6">
              <div className="lux-label">Cadence map</div>
              <h2 className="lux-title mt-3 text-2xl text-stone-950">Reminder sequence</h2>
              <div className="mt-5 grid gap-3">
                {cadence.map((item, index) => (
                  <div key={item.label} className="lux-list-card">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-950 text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-stone-950">{item.label}</div>
                        <div className="mt-1 text-sm text-stone-600">{item.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
