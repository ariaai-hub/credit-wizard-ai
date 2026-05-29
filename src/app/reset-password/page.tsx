"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicSiteNav } from "@/components/public-site-nav";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  if (!token) {
    return (
      <div className="mt-8 rounded-xl border border-rose-500/20 bg-rose-500/10 p-6">
        <p className="text-sm text-rose-300">This reset link is invalid or missing. Please request a new one.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm font-semibold text-sky-400 hover:text-sky-300">
          Request new reset link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
        setMessage("Your password has been updated.");
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6">
        <div className="flex items-center gap-3 mb-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald-400 shrink-0">
            <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-11v6h2v-6H9zm0-4v2h2V3H9z" fill="currentColor"/>
          </svg>
          <span className="font-semibold text-emerald-300">Password updated</span>
        </div>
        <p className="text-sm text-slate-300">{message}</p>
        <Link href="/sign-in" className="mt-4 inline-block rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-600">
          Sign in now
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-slate-500 backdrop-blur-sm focus:border-sky-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat new password"
          required
          minLength={8}
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
        disabled={status === "loading" || !password || !confirm}
        className="w-full rounded-xl bg-sky-500 py-3.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
      >
        {status === "loading" ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="app-frame text-white">
      <PublicSiteNav />
      <section className="mx-auto flex w-full max-w-3xl px-6 py-8 md:px-10 md:py-12">
        <section className="w-full public-surface p-8 sm:p-10">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">Password reset</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">Set a new password</h1>
          <p className="mt-4 text-base text-slate-300">
            Choose a strong password you haven't used before.
          </p>

          <Suspense fallback={<div className="mt-8 text-sm text-slate-400">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>

          <div className="mt-6 text-center text-sm text-slate-400">
            <Link href="/sign-in" className="font-semibold text-white hover:text-sky-300">
              Back to sign in
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
