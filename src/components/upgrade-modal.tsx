"use client";

import { useState } from "react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDownloadsUsed?: number;
  downloadsLimit?: number;
  onSuccess?: () => void;
}

export function UpgradeModal({
  isOpen,
  onClose,
  currentDownloadsUsed = 0,
  downloadsLimit = 3,
  onSuccess,
}: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleUpgrade(plan: "PRO" | "ELITE") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.ok) {
        onSuccess?.();
        onClose();
        window.location.reload();
      } else {
        setError(data.error ?? "Upgrade failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d1a2e] p-8 shadow-2xl"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-sky-400">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 id="upgrade-modal-title" className="text-2xl font-semibold text-white">
            {currentDownloadsUsed >= downloadsLimit
              ? "Monthly download limit reached"
              : "Unlock unlimited letter downloads"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            {currentDownloadsUsed >= downloadsLimit
              ? `You've used all ${downloadsLimit} of your free Starter downloads this month. Upgrade to Pro for unlimited access to all your dispute letters, any time.`
              : `You have ${downloadsLimit - currentDownloadsUsed} download${downloadsLimit - currentDownloadsUsed === 1 ? "" : "s"} remaining this month on your Starter plan. Upgrade to Pro for unlimited downloads.`}
          </p>
        </div>

        {/* Plan cards */}
        <div className="mt-8 grid gap-4">
          {/* PRO plan */}
          <div className="relative rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Pro</div>
                <div className="mt-1 text-3xl font-semibold text-white">
                  $59<span className="text-base text-slate-400">/mo</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["Unlimited letter downloads", "Priority support", "Advanced disputes"].map((badge) => (
                  <span key={badge} className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-300 uppercase tracking-wide">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {[
                "Unlimited dispute letter downloads",
                "Priority support response",
                "Advanced dispute strategies",
                "Full case management tools",
                "API access for integrations",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 text-sky-400">
                    <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade("PRO")}
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 px-4 py-3 text-sm font-semibold text-white hover:from-sky-300 hover:to-blue-400 transition disabled:opacity-50"
            >
              {loading ? "Processing..." : "Upgrade to Pro"}
            </button>
          </div>

          {/* ELITE plan */}
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="absolute -top-3 right-5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300">
              Best value
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Elite</div>
                <div className="mt-1 text-3xl font-semibold text-white">
                  $129<span className="text-base text-slate-400">/mo</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["Everything in Pro", "White-glove support", "Custom strategies"].map((badge) => (
                  <span key={badge} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300 uppercase tracking-wide">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {[
                "Everything in Pro, plus:",
                "Dedicated account manager",
                "Custom dispute escalation paths",
                "Full white-label client portal",
                "Monthly strategy review calls",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 text-slate-400">
                    <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade("ELITE")}
              disabled={loading}
              className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition disabled:opacity-50"
            >
              {loading ? "Processing..." : "Upgrade to Elite"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <p className="mt-5 text-center text-xs text-slate-500">
          Cancel anytime · No long-term contracts · Instant activation
        </p>
      </div>
    </div>
  );
}
