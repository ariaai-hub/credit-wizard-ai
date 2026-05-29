"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PlanKey = "STARTER" | "PRO" | "ELITE";

type PlanDetail = {
  key: PlanKey;
  name: string;
  price: number;
  color: "blue" | "green" | "amber";
  badgeClass: string;
  buttonClass: string;
  borderClass: string;
  glowClass: string;
};

const PLANS: PlanDetail[] = [
  {
    key: "STARTER",
    name: "Starter",
    price: 9.99,
    color: "blue",
    badgeClass: "border border-blue-500/30 bg-blue-500/10 text-blue-200",
    buttonClass: "bg-blue-500 hover:bg-blue-600 text-white",
    borderClass: "border-blue-500/30",
    glowClass: "shadow-[0_0_40px_rgba(59,130,246,0.15)]",
  },
  {
    key: "PRO",
    name: "Pro",
    price: 59.99,
    color: "green",
    badgeClass: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    buttonClass: "bg-emerald-500 hover:bg-emerald-600 text-white",
    borderClass: "border-emerald-500/40",
    glowClass: "shadow-[0_0_40px_rgba(16,185,129,0.2)]",
  },
  {
    key: "ELITE",
    name: "Elite",
    price: 129.99,
    color: "amber",
    badgeClass: "border border-amber-500/30 bg-amber-500/10 text-amber-200",
    buttonClass: "bg-amber-500 hover:bg-amber-600 text-white",
    borderClass: "border-amber-500/40",
    glowClass: "shadow-[0_0_40px_rgba(245,158,11,0.2)]",
  },
];

const ALL_FEATURES = [
  "Credit report analysis",
  "AI-powered dispute generation",
  "Letter PDF download",
  "Unlimited dispute letters",
  "Premium templates",
  "All 3 bureau tracking",
  "White-label letters",
  "Priority email support",
  "Dedicated account manager",
  "Custom letter templates",
  "API access",
  "Team collaboration (seats)",
  "Advanced analytics",
];

const PLAN_FEATURE_MAP: Record<PlanKey, string[]> = {
  STARTER: [
    "Credit report analysis",
    "Up to 5 dispute letters/mo",
    "Basic letter templates",
    "Email support",
    "1 bureau tracking",
  ],
  PRO: [
    "Credit report analysis",
    "AI-powered dispute generation",
    "Letter PDF download",
    "Unlimited dispute letters",
    "Premium templates",
    "All 3 bureau tracking",
    "Priority email support",
  ],
  ELITE: [
    "Credit report analysis",
    "AI-powered dispute generation",
    "Letter PDF download",
    "Unlimited dispute letters",
    "Premium templates",
    "All 3 bureau tracking",
    "White-label letters",
    "Priority email support",
    "Dedicated account manager",
    "Custom letter templates",
    "API access",
    "Team collaboration (10 seats)",
    "Advanced analytics",
  ],
};

const FAQ_ITEMS = [
  {
    q: "What happens to my letters?",
    a: "All your generated letters remain saved in your account. Upgrading doesn't affect any existing letters — they stay exactly as they are.",
  },
  {
    q: "Do I keep my data?",
    a: "Yes. Everything — your clients, disputes, letters, and history — is yours. Nothing is deleted or changed when you upgrade.",
  },
  {
    q: "When does billing change?",
    a: "Upgrades take effect immediately. You'll be charged a prorated amount for the remainder of your current billing cycle, then the new full amount next month.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel or downgrade at any time from your billing settings. No lock-in, no cancellation fees.",
  },
];

type UpgradeState = "idle" | "loading" | "success" | "error";

export function UpgradePageClient({
  currentPlan,
  tenantName,
}: {
  currentPlan: PlanKey;
  tenantName: string;
}) {
  const router = useRouter();
  const [upgradeState, setUpgradeState] = useState<UpgradeState>("idle");
  const [targetPlan, setTargetPlan] = useState<PlanKey | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const currentTier = currentPlan === "ELITE" ? 3 : currentPlan === "PRO" ? 2 : 1;

  const handleUpgrade = async (plan: PlanKey) => {
    if (plan === currentPlan) return;
    setUpgradeState("loading");
    setTargetPlan(plan);
    setErrorMessage("");

    try {
      const res = await fetch("/api/client/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upgrade failed. Please try again.");
      }
      setUpgradeState("success");
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch (err) {
      setUpgradeState("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  };

  const currentPlanDef = PLANS.find((p) => p.key === currentPlan)!;

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        {/* Hero */}
        <header className="public-surface p-8 md:p-10">
          <div className="lux-label">Plans</div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              You're on <span className="text-white">{currentPlanDef.name}</span>
            </h1>
            <span className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wider ${currentPlanDef.badgeClass}`}>
              Current plan
            </span>
          </div>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
            Unlock more features, higher limits, and priority support. Upgrade anytime — changes take effect immediately.
          </p>

          {upgradeState === "success" && (
            <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl text-emerald-400">✓</span>
                <div>
                  <div className="font-semibold text-emerald-200">Upgrade successful!</div>
                  <div className="mt-1 text-sm text-emerald-300/70">
                    Redirecting you to the dashboard…
                  </div>
                </div>
              </div>
            </div>
          )}

          {upgradeState === "error" && (
            <div className="mt-6 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5">
              <div className="flex items-start gap-3">
                <span className="text-xl text-rose-400">⚠</span>
                <div>
                  <div className="font-semibold text-rose-200">Something went wrong</div>
                  <div className="mt-1 text-sm text-rose-300/70">{errorMessage}</div>
                  <button
                    onClick={() => setUpgradeState("idle")}
                    className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Plan cards */}
        <section>
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = plan.key === currentPlan;
              const isPast = currentTier > (plan.key === "ELITE" ? 3 : plan.key === "PRO" ? 2 : 1);

              return (
                <div
                  key={plan.key}
                  className={`relative rounded-[1.75rem] border p-6 transition ${
                    isCurrent
                      ? `${plan.borderClass} bg-white/5 ring-1 ring-white/10 ${plan.glowClass}`
                      : plan.borderClass + " bg-white/[0.03]"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-6">
                      <span className={`inline-flex items-center rounded-full px-4 py-1 text-[11px] font-semibold uppercase tracking-wider ${plan.badgeClass}`}>
                        Current plan
                      </span>
                    </div>
                  )}

                  <div className="mt-2 text-xl font-semibold text-white">{plan.name}</div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold text-white">${plan.price}</span>
                    <span className="text-slate-400">/month</span>
                  </div>

                  {isCurrent ? (
                    <div className="mt-5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-center text-sm font-semibold text-slate-400">
                      Your current plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={upgradeState === "loading"}
                      className={`mt-5 w-full rounded-xl py-3 text-sm font-semibold transition ${
                        isPast ? plan.buttonClass + " opacity-60 cursor-not-allowed" : plan.buttonClass
                      }`}
                    >
                      {upgradeState === "loading" && targetPlan === plan.key ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          Processing…
                        </span>
                      ) : isPast ? (
                        `Downgrade to ${plan.name}`
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Feature comparison */}
        <section className="public-surface p-6 md:p-8">
          <div className="lux-label">Compare plans</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">What's included</h2>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-4 text-left font-semibold text-slate-300">Feature</th>
                  {PLANS.map((p) => (
                    <th
                      key={p.key}
                      className={`pb-4 text-center font-semibold ${p.key === currentPlan ? "text-white" : "text-slate-400"}`}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ALL_FEATURES.map((feature) => (
                  <tr key={feature}>
                    <td className="py-3 text-slate-300">{feature}</td>
                    {PLANS.map((plan) => {
                      const included =
                        plan.key === "STARTER"
                          ? PLAN_FEATURE_MAP["STARTER"].includes(feature)
                          : plan.key === "PRO"
                          ? PLAN_FEATURE_MAP["PRO"].includes(feature)
                          : true;
                      return (
                        <td key={plan.key} className="py-3 text-center">
                          {included ? (
                            <span className="text-emerald-400">✓</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="public-surface p-6 md:p-8">
          <div className="lux-label">FAQ</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Common questions</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-base font-semibold text-white">{item.q}</div>
                <p className="mt-2 text-sm leading-7 text-slate-400">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
