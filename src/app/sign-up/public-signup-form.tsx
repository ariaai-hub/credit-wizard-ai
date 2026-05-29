"use client";

import { useRef, useState } from "react";

export function PublicSignupForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<"trial" | "paid" | null>(null);

  async function handleSubmit(mode: "trial" | "paid") {
    const form = formRef.current;
    if (!form) {
      return;
    }

    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);

    setError(null);
    setPendingMode(mode);

    try {
      const response = await fetch("/api/public-signup/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: String(formData.get("companyName") ?? ""),
          ownerName: String(formData.get("ownerName") ?? ""),
          ownerEmail: String(formData.get("ownerEmail") ?? ""),
          password: String(formData.get("password") ?? ""),
          signupMode: mode,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string; url?: string };

      if (!response.ok || !data.ok || !data.url) {
        const rawError = data.error ?? "Something went wrong while opening checkout.";
        setError(rawError.includes("NEXT_REDIRECT") ? "Checkout handoff failed. Reload the page and try again." : rawError);
        setPendingMode(null);
        return;
      }

      window.location.assign(data.url);
    } catch {
      setError("Something went wrong while opening checkout.");
      setPendingMode(null);
    }
  }

  const isPending = pendingMode !== null;

  return (
    <form ref={formRef} className="mt-6 grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-200">
          Company name
          <input name="companyName" required autoComplete="organization" className="public-input px-4 py-3 outline-none ring-0" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-200">
          Owner name
          <input name="ownerName" required autoComplete="name" className="public-input px-4 py-3 outline-none ring-0" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-200 md:col-span-2">
          Email
          <input type="email" name="ownerEmail" required autoComplete="email" className="public-input px-4 py-3 outline-none ring-0" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Password
        <input type="password" name="password" minLength={10} required autoComplete="new-password" className="public-input px-4 py-3 outline-none ring-0" />
      </label>

      {isPending ? (
        <div className="rounded-[1.2rem] border border-sky-400/25 bg-sky-500/10 px-4 py-4 text-sm leading-7 text-sky-100">
          Opening secure checkout...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[1.2rem] border border-rose-400/25 bg-rose-500/10 px-4 py-4 text-sm leading-7 text-rose-100">
          {error}
        </div>
      ) : null}

      <label className="flex items-start gap-3 text-sm text-slate-400">
        <input type="checkbox" name="termsConsent" required className="mt-0.5 shrink-0 rounded border-slate-600 bg-transparent" />
        <span>
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-200">Terms of Service</a>
          {" "}and{" "}
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-200">Privacy Policy</a>
        </span>
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => handleSubmit("trial")}
          disabled={isPending}
          className="lux-button-primary flex min-h-[4.6rem] flex-col items-center justify-center rounded-[1.25rem] px-6 py-4 text-center disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="text-sm font-semibold">{pendingMode === "trial" ? "Opening checkout..." : "Start free trial"}</span>
          <span className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-300">Load your first file</span>
        </button>

        <button
          type="button"
          onClick={() => handleSubmit("paid")}
          disabled={isPending}
          className="lux-button-secondary flex min-h-[4.6rem] flex-col items-center justify-center rounded-[1.25rem] px-6 py-4 text-center disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="text-sm font-semibold">{pendingMode === "paid" ? "Opening checkout..." : "Start paid now"}</span>
          <span className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-300">Skip trial</span>
        </button>
      </div>
    </form>
  );
}
