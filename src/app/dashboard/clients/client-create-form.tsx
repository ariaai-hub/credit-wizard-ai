"use client";

import { useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createClientWithOnboardingLink } from "./actions";

function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:bg-sky-400 disabled:opacity-60"
    >
      {pending ? "Creating..." : children}
    </button>
  );
}

export function ClientCreateForm({ onClose }: { onClose?: () => void }) {
  const [result, setResult] = useState<{ ok: boolean; message: string; onboardingUrl?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    if (!result?.onboardingUrl) return;
    navigator.clipboard.writeText(result.onboardingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-[#0d1a2e] p-5">
      <div className="mb-4 text-sm font-semibold text-white">Add new client</div>
      {!result ? (
        <form
          action={async (formData) => {
            const res = await createClientWithOnboardingLink({ ok: false, message: "" }, formData);
            setResult(res);
          }}
          className="grid gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">First name</label>
              <input name="firstName" required className="w-full rounded-xl border border-white/10 bg-[#091426] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400" placeholder="First name" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">Last name</label>
              <input name="lastName" required className="w-full rounded-xl border border-white/10 bg-[#091426] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400" placeholder="Last name" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">Email</label>
              <input name="email" type="email" className="w-full rounded-xl border border-white/10 bg-[#091426] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400" placeholder="client@example.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">Phone</label>
              <input name="phone" type="tel" className="w-full rounded-xl border border-white/10 bg-[#091426] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400" placeholder="+1 (555) 000-0000" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">Mailing preference</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#091426] px-4 py-2.5 text-sm text-white cursor-pointer hover:border-white/20 has-checked:border-sky-500/50 has-checked:bg-sky-500/10">
                <input type="radio" name="mailPreference" value="REGULAR" defaultChecked className="accent-sky-500" />
                Regular mail
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#091426] px-4 py-2.5 text-sm text-white cursor-pointer hover:border-white/20 has-checked:border-sky-500/50 has-checked:bg-sky-500/10">
                <input type="radio" name="mailPreference" value="CERTIFIED" className="accent-sky-500" />
                Certified mail (+6 tokens)
              </label>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            {onClose && (
              <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-slate-400 transition-all hover:border-white/20 hover:text-white">
                Cancel
              </button>
            )}
            <SubmitButton>Generate onboarding link</SubmitButton>
          </div>
        </form>
      ) : result.ok && result.onboardingUrl ? (
        <div>
          <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {result.message}
          </div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Onboarding link</div>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={result.onboardingUrl}
              className="flex-1 rounded-xl border border-white/10 bg-[#091426] px-4 py-2.5 text-xs text-slate-300"
            />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/10"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-slate-500">Send this link to your client. It expires in 30 days.</p>
          {onClose && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => { setResult(null); onClose(); }}
                className="rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-slate-400 transition-all hover:border-white/20 hover:text-white"
              >
                Done
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {result.message}
        </div>
      )}
    </div>
  );
}
