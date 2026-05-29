import type { ReactNode } from "react";

import { DashboardNav } from "@/components/dashboard-nav";
import { isSuperAdmin } from "@/lib/admin";
import { requireSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const internalOwner = isSuperAdmin(session.email);

  return (
    <div className="min-h-screen bg-[#07111f] xl:flex">
      <DashboardNav role={session.role} email={session.email} internalOwner={internalOwner} isSuperAdmin={internalOwner} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
