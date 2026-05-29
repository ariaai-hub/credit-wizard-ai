"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getCompanyProfile() {
  const session = await requireSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = await (prisma.tenant as any).findUnique({
    where: { id: session.tenantId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      primaryColor: true,
      accentColor: true,
      defaultMailType: true,
      ownerName: true,
      ownerEmail: true,
      billingEmail: true,
    },
  });
  return tenant;
}

export async function updateCompanyProfile(
  _prevState: unknown,
  formData: FormData,
): Promise<void> {
  const session = await requireSession();
  const tenantId = session.tenantId;

  const logoUrl = formData.get("logoUrl") as string | null;
  const primaryColorText = formData.get("primaryColorText") as string | null;
  const accentColorText = formData.get("accentColorText") as string | null;
  const defaultMailType = formData.get("defaultMailType") as string | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if (logoUrl !== null) data.logoUrl = logoUrl || null;
  if (primaryColorText !== null) data.primaryColor = primaryColorText;
  if (accentColorText !== null) data.accentColor = accentColorText;
  if (defaultMailType !== null) data.defaultMailType = defaultMailType;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.tenant as any).update({
    where: { id: tenantId },
    data,
  });

  revalidatePath("/dashboard/profile");
}
