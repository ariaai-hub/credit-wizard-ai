"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicSiteNav } from "@/components/public-site-nav";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
        setMessage("Check your inbox — if that email is in our system, a reset link has been sent.");
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Try again.");
    }
  }

  return (
    <main className="app-frame text-white">
      <PublicSiteNav />
      <section className="mx-auto flex w-full max-w-3xl px-6 py-8 md:px-10 md:py-12">
        <section className="w-full public-surface p-8 sm:p-10">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">Password reset</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">Forgot your password?</h1>
          <p className="mt-4 text-base text-slate-300">
            Enter your email and we'll send you a secure reset link.
          </p>

          {status === "success" ? (
            <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald-400 shrink-0">
                  <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-11v6h2v-6h-2zm0-4v2h2V3H9z" fill="currentColor"/>
                </svg>
                <span className="font-semibold text-emerald-300">Email sent</span>
              </div>
              <p className="text-sm text-slate-300">{message}</p>
              <p className="mt-4 text-sm text-slate-400">Didn't get it? Check your spam folder, or try again.</p>
              <button onClick={() => setStatus("idle")} className="mt-4 text-sm font-semibold text-sky-400 hover:text-sky-300">
                Try again
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-slate-500 backdrop-blur-sm focus:border-sky-500 focus:outline-none"
                />
              </div>

              {status === "error" && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading" || !email.trim()}
                className="w-full rounded-xl bg-sky-500 py-3.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
              >
                {status === "loading" ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-400">
            Remember your password?{" "}
            <Link href="/sign-in" className="font-semibold text-white hover:text-sky-300">
              Sign in
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
