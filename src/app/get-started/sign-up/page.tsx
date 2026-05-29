"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { PublicSiteNav } from "@/components/public-site-nav";

type PlanKey = "starter" | "pro" | "elite";

const PLANS = [
  {
    key: "starter" as PlanKey,
    name: "Starter",
    price: "$9.99",
    period: "/month",
    description: "Essential access to dispute letter generation and tracking.",
    features: [
      "Unlimited dispute letter generation",
      "Equifax, Experian & TransUnion support",
      "Download as print-ready PDF",
      "Basic dispute tracking",
      "Email support",
    ],
    color: "blue" as const,
  },
  {
    key: "pro" as PlanKey,
    name: "Pro",
    price: "$59.99",
    period: "/month",
    description: "Advanced strategy, priority generation, and full progress tracking.",
    badge: "Most popular",
    features: [
      "Everything in Starter",
      "Advanced dispute strategy tools",
      "Priority letter generation",
      "Full progress & milestone tracking",
      "Dispute outcome logging",
      "Priority email & chat support",
    ],
    color: "emerald" as const,
  },
  {
    key: "elite" as PlanKey,
    name: "Elite",
    price: "$129.99",
    period: "/month",
    description: "Specialist report review and a personalized credit action plan.",
    badge: "Best value",
    features: [
      "Everything in Pro",
      "Dedicated credit specialist report review",
      "Personalized action plan",
      "Quarterly strategy call (30 min)",
      "Escalated priority support",
      "Advanced credit analysis dashboard",
    ],
    color: "amber" as const,
  },
];

const COLOR_MAP = {
  blue: {
    border: "border-blue-400/25",
    bg: "bg-blue-500/10",
    selectedBorder: "border-blue-400",
    badge: "bg-blue-500/20 text-blue-300",
    icon: "text-blue-400",
  },
  emerald: {
    border: "border-emerald-400/25",
    bg: "bg-emerald-500/10",
    selectedBorder: "border-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-300",
    icon: "text-emerald-400",
  },
  amber: {
    border: "border-amber-400/25",
    bg: "bg-amber-500/10",
    selectedBorder: "border-amber-400",
    badge: "bg-amber-500/20 text-amber-300",
    icon: "text-amber-400",
  },
};

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function PasswordInput({ id, name, label, autoComplete }: { id: string; name: string; label: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required
        autoComplete={autoComplete}
        className="peer w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition pr-12"
        placeholder={label}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}

function SignUpForm() {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") ?? "";

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("starter");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const name = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const res = await fetch("/api/public-signup/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, plan: selectedPlan, referralCode }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; url?: string };

      if (!res.ok || !data.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setIsPending(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">Create your account</div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
          Choose your plan
        </h1>
        <p className="mt-3 text-base text-slate-300">
          All plans include unlimited dispute letter generation.
        </p>
      </div>

      {/* Form Card */}
      <div className="public-surface p-8 md:p-10">
        <form onSubmit={handleSubmit} noValidate className="grid gap-6">
          {/* Name */}
          <div className="grid gap-2">
            <label htmlFor="fullName" className="text-sm font-medium text-slate-200">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="Jane Smith"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition"
            />
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-200">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition"
            />
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-200">
              Password
            </label>
            <PasswordInput id="password" name="password" label="Password" autoComplete="new-password" />
          </div>

          {/* Confirm Password */}
          <div className="grid gap-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-200">
              Confirm Password
            </label>
            <PasswordInput id="confirmPassword" name="confirmPassword" label="Confirm Password" autoComplete="new-password" />
          </div>

          {/* Plan Selector */}
          <div className="grid gap-3">
            <div className="text-sm font-medium text-slate-200">Select your plan</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {PLANS.map((plan) => {
                const colors = COLOR_MAP[plan.color];
                const isSelected = selectedPlan === plan.key;
                const badgeText = plan.key === "pro" ? "Most popular" : plan.key === "elite" ? "Best value" : null;
                return (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => setSelectedPlan(plan.key)}
                    className={[
                      "relative cursor-pointer rounded-[1.4rem] border p-5 text-left transition-all",
                      isSelected
                        ? `${colors.selectedBorder} ${colors.bg}`
                        : `border-white/10 bg-white/5 hover:border-white/20`,
                    ].join(" ")}
                  >
                    {badgeText ? (
                      <span className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colors.badge}`}>
                        {badgeText}
                      </span>
                    ) : null}
                    <div className={`text-xs font-bold uppercase tracking-[0.18em] ${isSelected ? "text-white" : "text-slate-400"}`}>
                      {plan.name}
                    </div>
                    <div className="mt-3 flex items-end gap-1">
                      <span className="text-2xl font-semibold tracking-tight text-white">{plan.price}</span>
                      <span className="mb-0.5 text-sm text-slate-400">{plan.period}</span>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {plan.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                          <svg className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${colors.icon}`} fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 text-sm text-slate-400">
            <input
              type="checkbox"
              name="termsConsent"
              required
              className="mt-0.5 shrink-0 rounded border-slate-600 bg-transparent"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-200">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-200">
                Privacy Policy
              </Link>
            </span>
          </label>

          {/* Error */}
          {error ? (
            <div className="rounded-[1.2rem] border border-rose-400/25 bg-rose-500/10 px-4 py-4 text-sm leading-7 text-rose-100">
              {error}
            </div>
          ) : null}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-sky-600 hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {isPending ? "Redirecting to checkout..." : `Continue with ${PLANS.find((p) => p.key === selectedPlan)?.name} — ${PLANS.find((p) => p.key === selectedPlan)?.price}/mo`}
          </button>
        </form>

        {/* Sign in link */}
        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-white underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>

      {/* Privacy note */}
      <p className="text-center text-xs text-slate-500">
        Your data is encrypted and never sold. See our{" "}
        <Link href="/privacy-policy" className="underline hover:text-slate-400">
          Privacy Policy
        </Link>
        .
      </p>
    </>
  );
}

export default function ConsumerSignUpPage() {
  return (
    <main className="app-frame text-white">
      <PublicSiteNav />
      <section className="mx-auto flex w-full max-w-[62rem] flex-col gap-8 px-6 py-10 md:px-10 md:py-16">
        <Suspense fallback={null}>
          <SignUpForm />
        </Suspense>
      </section>
    </main>
  );
}