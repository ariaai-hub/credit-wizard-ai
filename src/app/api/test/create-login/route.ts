import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SECRET = "kestrel-test-seed-2026";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, password, companyName, ownerName } = await request.json();

  if (!email || !password || !companyName) {
    return NextResponse.json({ error: "email, password, and companyName are required" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const slug = companyName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const displayName = ownerName ?? email.split("@")[0];

  // Create or find tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: companyName,
      billingEmail: email,
      ownerName: displayName,
      ownerEmail: email,
      status: "ACTIVE",
      accessMode: "READ_WRITE",
    },
  });

  // Create or update user
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    update: { passwordHash, name: displayName },
    create: {
      email,
      name: displayName,
      passwordHash,
      tenantId: tenant.id,
      role: "OWNER",
    },
  });

  // Ensure token account
  await prisma.tokenAccount.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      includedBalance: 500,
      purchasedBalance: 0,
      reservedBalance: 0,
    },
  });

  return NextResponse.json({ ok: true, email, company: tenant.name });
}
