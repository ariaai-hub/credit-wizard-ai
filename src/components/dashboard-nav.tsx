"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { signOutAction } from "@/app/sign-out/actions";

type DashboardNavProps = {
  role: string;
  email: string;
  plan?: string | null;
  internalOwner?: boolean;
  isSuperAdmin?: boolean;
};

const companyNavItems = (isOwner: boolean, plan?: string | null) => [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/intake", label: "Client Snapshot" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/team", label: "Team" },
  { href: "/dashboard/profile", label: "Company Profile" },
  ...(isOwner
    ? [{ href: "/dashboard/mail", label: "Mail Queue" }]
    : [{ href: "/dashboard/mail-expenses", label: "Mail Expenses" }]),
  ...(plan === "PRO" || plan === "ELITE"
    ? [{ href: "/dashboard/affiliate", label: "Affiliate" }]
    : []),
  ...(plan === "ELITE"
    ? [{ href: "/dashboard/elite-content", label: "Elite Content" }]
    : []),
];

const internalNavItems = (isSuperAdminEmail: boolean, plan?: string | null) => [
  ...companyNavItems(true, plan),
  { href: "/dashboard/automation", label: "Automations" },
  { href: "/dashboard/integrations", label: "Integrations" },
  { href: "/dashboard/audit", label: "Audit" },
  { href: "/dashboard/observability", label: "Bot Quality" },
];

function formatRoleLabel(role: string) {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "SUPPORT":
      return "Support";
    case "ANALYST":
      return "Analyst";
    case "MAIL_TEAM":
      return "Operations";
    default:
      return role.toLowerCase();
  }
}

export function DashboardNav({ role, email, plan, internalOwner = false, isSuperAdmin = false }: DashboardNavProps) {
  const pathname = usePathname();
  const navItems = internalOwner
    ? internalNavItems(isSuperAdmin, plan)
    : companyNavItems(role === "OWNER", plan);

  return (
    <aside className="hidden min-h-screen w-[290px] shrink-0 border-r border-white/10 bg-[#081120]/92 xl:block">
      <div className="sticky top-0 flex min-h-screen flex-col px-6 py-8 text-slate-100">
        <BrandLogo compact />
        <div className="mt-8 rounded-[1.6rem] border border-sky-400/16 bg-white/[0.04] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Signed in</div>
          <div className="mt-2 text-base font-semibold text-white">{formatRoleLabel(role)}</div>
          <div className="mt-1 text-sm leading-6 text-slate-300">{email}</div>
        </div>
        <nav className="mt-8 grid gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                className={`rounded-[1.2rem] px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-sky-500 text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)]"
                    : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}

function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="w-full rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
      >
        Sign out
      </button>
    </form>
  );
}
