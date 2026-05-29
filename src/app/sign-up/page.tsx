import Image from "next/image";
import Link from "next/link";

import { PublicSiteNav } from "@/components/public-site-nav";
import { PLAN_DEFINITIONS } from "@/lib/billing";
import { formatCurrency } from "@/lib/utils";

import { PublicSignupForm } from "./public-signup-form";

const starterPlan = PLAN_DEFINITIONS.find((plan) => plan.key === "starter")!;

const headlinePoints = [
  "Automated customer service handles the client back-and-forth so your team does not have to babysit every file.",
  "Mail handling is built in, so disputes move out the door without adding another operations mess.",
  "Dispute workflow, documents, support, billing, and delivery stay in one system instead of five scattered tools.",
  "You sell the client. The platform helps carry the operational load after the close, including status messaging and follow-up.",
];

const valueCards = [
  {
    title: "Close more clients",
    body: "The offer is easier to sell when the backend looks real, organized, and built to scale.",
  },
  {
    title: "Run leaner",
    body: "Support, mailing, dispute prep, and file visibility stay centralized so growth does not instantly create chaos.",
  },
  {
    title: "Look bigger than you are",
    body: "Give prospects and clients a cleaner software experience than the typical small-shop credit repair operation.",
  },
];

const offerStack = [
  "Client portal with clean status visibility",
  "Automated onboarding follow-up and support communication",
  "Document collection and file organization",
  "Dispute workflow built for repeatable delivery",
  "Mail handling and mailed-status updates built into the operating flow",
  "Billing structure that is clear to the owner",
];

const updateMoments = [
  {
    title: "Onboarding follow-up",
    body: "If the client still owes documents or intake items, the system keeps the process moving with automated follow-up instead of forcing your team into endless back-and-forth.",
  },
  {
    title: "Mailed updates",
    body: "When disputes go out, the client gets updated so they know the file moved and your staff does not need to manually send the same message over and over.",
  },
  {
    title: "Wins and score movement",
    body: "When results come in, the system can surface wins, deletions, and score improvements so the client feels progress without needing to chase your office for answers.",
  },
  {
    title: "Funding-ready messaging",
    body: "When a file reaches the right point, the client can be notified that they are funding ready without your team having to remember every milestone by hand.",
  },
];

const outcomeBlocks = [
  {
    title: "More deletions, less confusion",
    body: "When file movement, mailing, support, and dispute work live in one operating system, delivery gets cleaner and clients feel more confident staying in the program.",
  },
  {
    title: "Automation where it actually matters",
    body: "The value is not just a prettier dashboard. The value is reducing the manual back-and-forth that slows fulfillment, burns staff time, and weakens retention.",
  },
  {
    title: "A stronger thing to sell",
    body: "It is easier to close when the prospect can see a real client experience, a real support flow, a real file process, and a real delivery engine behind the pitch.",
  },
];

const operatorPain = [
  "Too many companies are still trying to scale with scattered inboxes, manual updates, patchwork tools, and messy handoffs.",
  "That makes every new sale harder to fulfill, every client harder to keep calm, and every growth push more expensive than it should be.",
  "creditwizard.ai is built to help solve the backend side of that problem so the company can sell with more confidence and deliver with more consistency.",
];

const afterCloseBlocks = [
  {
    title: "The file stops going dark",
    body: "Clients can see that documents were received, notices went out, and progress is still moving. That alone changes how real the service feels after payment clears.",
  },
  {
    title: "Routine support stops eating labor",
    body: "The team spends less time repeating status updates, less time calming people down, and less time cleaning up confusion that should have been prevented upstream.",
  },
  {
    title: "Growth lands on a system, not on chaos",
    body: "Support, mailing, disputes, and visibility stay connected, so new volume does not immediately turn into missed handoffs, messy inboxes, and operator drag.",
  },
];

const businessEffects = [
  {
    title: "Less chasing",
    body: "The everyday check-in work gets pushed into the system instead of sitting on somebody's memory.",
  },
  {
    title: "Better retention pressure",
    body: "When clients can feel movement, they stay calmer. Calm clients are easier to keep.",
  },
  {
    title: "A stronger close",
    body: "The offer gets easier to defend when the backend feels as organized as the pitch.",
  },
];

const clientUpdateExamples = [
  {
    label: "Mailed update",
    body: "Your dispute package has been mailed and logged to your file. We will update you again when new results post.",
  },
  {
    label: "Results update",
    body: "Your latest round has been received. Your file has been updated and the next step is already in motion.",
  },
  {
    label: "Win update",
    body: "Good news. A positive result has posted to your file and your progress summary has been updated.",
  },
  {
    label: "Funding-ready update",
    body: "Your profile now meets our current funding-ready standard, and your next option is available inside the portal.",
  },
];

const trialReasons = [
  "Look at the sales story and decide whether it feels easier to close with this behind it.",
  "Watch the client journey and decide whether it feels calmer, clearer, and more premium.",
  "Look at your team's workflow and decide whether this removes enough friction to matter.",
];

const showcaseSellingPoints = [
  {
    title: "Now the backend feels real",
    body: "When they see update coverage, visible file movement, and a clean status layer, the offer stops sounding theoretical.",
  },
  {
    title: "Now you can sell peace of mind",
    body: "You are not only selling dispute work. You are selling the confidence that clients will not be left in the dark after payment.",
  },
  {
    title: "Now the price makes more sense",
    body: "A sharper dashboard makes it easier to justify value, explain the process, and look more serious than the next company in line.",
  },
];

const steps = [
  {
    title: "Start the workspace",
    body: "Create the account, choose trial or paid, and open checkout.",
  },
  {
    title: "Load the first file",
    body: "Bring in the first client file and let the system start doing the operational work.",
  },
  {
    title: "Sell and scale",
    body: "Keep acquiring clients while the backend runs with more consistency than manual follow-up alone.",
  },
];

export default function SignUpPage() {
  return (
    <main className="app-frame text-white">
      <PublicSiteNav />

      <section className="mx-auto grid w-full max-w-[94rem] gap-8 px-6 py-8 md:px-10 md:py-10 lg:grid-cols-[1.04fr_0.96fr]">
        <section className="public-surface p-8 md:p-10 lg:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">Start here</div>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
            The software that helps credit repair companies close clients, automate delivery, and scale without drowning in operations.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            creditwizard.ai is built to make your company look sharper, run cleaner, and carry more client load without turning every new sale into more manual chaos.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className="lux-button-secondary">
              Try the demo
            </Link>
            <div className="rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100">
              7-day trial available
            </div>
          </div>

          <div className="mt-10 rounded-[1.8rem] border border-sky-400/16 bg-white/[0.03] p-5 md:p-6 lg:p-8">
            <div className="max-w-4xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">Feature spotlight</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                This is the screen that makes the backend feel worth paying for.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300 md:text-lg">
                Put this in front of a prospect and they instantly understand what they are buying. The file stays active, the client stays informed, and the company does not disappear after the close.
              </p>
            </div>

            <div className="mt-8 rounded-[2rem] border border-sky-300/14 bg-[#081426] p-4 shadow-[0_24px_70px_rgba(2,6,23,0.38)] md:p-5 lg:p-6">
              <div className="rounded-[1.6rem] border border-white/8 bg-[#0b1830] p-3 md:p-4 lg:p-5">
                <Image
                  src="/sign-up-support-automation.svg"
                  alt="Support automation visual"
                  width={1200}
                  height={780}
                  className="h-auto w-full rounded-[1.25rem]"
                  priority
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {showcaseSellingPoints.map((item) => (
                <div key={item.title} className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-lg font-semibold text-white">{item.title}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-300">{item.body}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 md:p-5">
                <Image
                  src="/sign-up-client-wins.svg"
                  alt="Client win update visual"
                  width={1200}
                  height={780}
                  className="h-auto w-full rounded-[1.2rem]"
                />
              </div>

              <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-6 md:p-7">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">What this second screen says</div>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
                  Your clients can see wins, score movement, and next steps without needing a personal check-in every time.
                </h3>
                <p className="mt-4 text-base leading-8 text-slate-300">
                  That improves the client experience, and it gives your sales story something visual to stand on when you explain why your service feels more organized than the typical operator.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="public-surface p-8 md:p-10">
          <div className="mt-8 grid gap-3">
            {headlinePoints.map((item) => (
              <div key={item} className="public-surface-soft px-4 py-4 text-sm leading-7 text-slate-200">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-3">
            {valueCards.map((card) => (
              <article key={card.title} className="public-surface-soft p-4">
                <div className="text-base font-semibold text-white">{card.title}</div>
                <div className="mt-3 text-sm leading-7 text-slate-300">{card.body}</div>
              </article>
            ))}
          </div>

          <div className="mt-8 public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">What the platform helps handle</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {offerStack.map((item) => (
                <div key={item} className="rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">What the client gets updated about automatically</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {updateMoments.map((item) => (
                <div key={item.title} className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-base font-semibold text-white">{item.title}</div>
                  <div className="mt-3 text-sm leading-7 text-slate-300">{item.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">How companies use it</div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-sm font-semibold text-white">{index + 1}</div>
                  <div className="mt-4 text-base font-semibold text-white">{step.title}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-300">{step.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Why this offer is stronger</div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {outcomeBlocks.map((item) => (
                <div key={item.title} className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-base font-semibold text-white">{item.title}</div>
                  <div className="mt-3 text-sm leading-7 text-slate-300">{item.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 public-surface-soft p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">The real problem this helps solve</div>
            <div className="mt-4 grid gap-3">
              {operatorPain.map((item) => (
                <div key={item} className="rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-7 text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="signup-form" className="public-surface scroll-mt-28 p-8 md:p-10">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">Create your workspace</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
            Start the trial or go paid now.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-300">
            Use the Starter plan to get inside the product, load a file, and see how the system carries the work.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="public-surface-soft p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200/70">Starter plan</div>
              <div className="mt-2 text-3xl font-semibold text-white">{formatCurrency(starterPlan.monthlyPrice)}</div>
              <div className="mt-1 text-sm text-slate-300">after the trial unless paid service starts immediately</div>
            </div>
            <div className="public-surface-soft p-4 text-sm leading-7 text-slate-300">
              Includes {starterPlan.includedTokens} monthly tokens, {starterPlan.staffSeatLimit} staff seats, and card-on-file billing from day one.
            </div>
            <div className="public-surface-soft p-4 text-sm leading-7 text-slate-300">
              Best for owners who want to see the software, test the client experience, and judge the backend on real file flow instead of sales talk alone.
            </div>
            <div className="public-surface-soft p-4 text-sm leading-7 text-slate-300">
              If this makes the company easier to close, easier to fulfill, and easier to grow, the trial already paid for itself in clarity.
            </div>
          </div>

          <PublicSignupForm />

          <div className="mt-6 public-surface-soft p-4 text-sm leading-7 text-slate-300">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-white underline underline-offset-4">
              Sign in
            </Link>
          </div>

          <div className="mt-8 border-t border-white/10 pt-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">What the owner is actually paying for</div>
            <h3 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              A company that still feels buttoned up after the client says yes.
            </h3>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Most companies sound fine on the sales call. The drop-off happens after payment, when updates get missed, support gets sloppy, and the client starts wondering whether anything is really happening. That is the gap this is built to close.
            </p>

            <div className="mt-6 grid gap-4">
              {afterCloseBlocks.map((item) => (
                <div key={item.title} className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-xl font-semibold text-white">{item.title}</div>
                  <div className="mt-3 text-base leading-8 text-slate-300">{item.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 public-surface-soft p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Why it matters to the business</div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {businessEffects.map((item) => (
                <div key={item.title} className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-lg font-semibold text-white">{item.title}</div>
                  <div className="mt-3 text-sm leading-7 text-slate-300">{item.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 public-surface-soft p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">What the client actually sees</div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              The point is not to sound automated. The point is to make progress visible so the client experiences momentum instead of silence.
            </p>
            <div className="mt-4 grid gap-4">
              {clientUpdateExamples.map((item) => (
                <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">{item.label}</div>
                  <div className="mt-3 text-lg leading-8 text-white">{item.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-sky-400/20 bg-sky-400/10 p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">What the trial should prove in one week</div>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
              You should know very quickly whether this makes your operation look more serious.
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-sky-100/85">
              Not prettier. More serious. Better to sell, easier to support, and cleaner to run once real clients start moving through it.
            </p>
            <div className="mt-5 grid gap-3">
              {trialReasons.map((item) => (
                <div key={item} className="rounded-[1rem] border border-white/10 bg-white/[0.06] px-4 py-4 text-base leading-8 text-slate-100">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/demo" className="lux-button-secondary">
                View demo
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
