import Link from "next/link";

import { PublicSiteNav } from "@/components/public-site-nav";

import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="app-frame text-white">
      <PublicSiteNav />

      <section className="mx-auto flex w-full max-w-3xl px-6 py-8 md:px-10 md:py-12">
        <section className="w-full public-surface p-8 sm:p-10">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">Sign in</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">Access your workspace.</h1>

          <SignInForm />
          <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-400">
            <Link href="/sign-up" className="font-semibold text-white underline underline-offset-4">
              Create an account
            </Link>
            <Link href="/forgot-password" className="font-semibold text-white hover:text-sky-300">
              Forgot password?
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
