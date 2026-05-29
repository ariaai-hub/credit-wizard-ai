"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";

const navItems = [
  { href: "/get-started", label: "For Individuals" },
  { href: "/", label: "For Agencies" },
];

export function PublicSiteNav() {
  const pathname = usePathname();
  const ctaHref = pathname === "/sign-up" ? "#signup-form" : "/sign-up";
  const ctaLabel = pathname === "/sign-up" ? "Start Below" : "Sign Up";

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#081120]/88 backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-6 py-4 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <BrandLogo dark />
          <nav className="hidden items-center gap-2 md:flex md:flex-1 md:justify-center">
            {navItems.map((item) => {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="hidden text-sm font-medium text-slate-300 transition hover:text-white md:inline-flex">
              Sign in
            </Link>
            <Link href={ctaHref} className="lux-button-primary inline-flex min-h-[3.15rem] flex-col items-center justify-center px-5 py-2 text-center">
              <span className="text-sm font-semibold leading-none">{ctaLabel}</span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-stone-300">7-day trial</span>
            </Link>
          </div>
        </div>

        <nav className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 md:hidden">
          {navItems.map((item) => {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/sign-in"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
