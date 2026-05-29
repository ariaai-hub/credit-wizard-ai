import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { UserRole, ClientLifecycleStage } from "@prisma/client";
import { createClientPortalAccessToken } from "@/lib/client-access";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const TEST_SEED_SECRET = "kestrel-test-seed-2026";

const TEST_COMPANIES = [
  {
    name: "Test Company Alpha",
    slug: "test-company-alpha",
    ownerName: "Marcus Rivera",
    ownerEmail: "marcus@test-company-alpha.com",
    staff: [
      { name: "Keisha Thompson", email: "keisha@test-company-alpha.com", role: UserRole.ADMIN },
      { name: "Devon Park", email: "devon@test-company-alpha.com", role: UserRole.SUPPORT },
    ],
    clients: [
      { firstName: "Alicia", lastName: "Barnes", email: "alicia.barnes@gmail.com", phone: "+15550010001" },
      { firstName: "Jerome", lastName: "Williams", email: "jerome.williams@gmail.com", phone: "+15550010002" },
      { firstName: "Simone", lastName: "Coles", email: "simone.coles@gmail.com", phone: "+15550010003" },
    ],
  },
  {
    name: "Test Company Beta",
    slug: "test-company-beta",
    ownerName: "Fatima Hassan",
    ownerEmail: "fatima@test-company-beta.com",
    staff: [
      { name: "Leon Obi", email: "leon@test-company-beta.com", role: UserRole.ANALYST },
    ],
    clients: [
      { firstName: "Tasha", lastName: "Rivers", email: "tasha.rivers@gmail.com", phone: "+15550020001" },
      { firstName: "Andre", lastName: "Mason", email: "andre.mason@gmail.com", phone: "+15550020002" },
    ],
  },
];

async function makeClientPortalToken(tenantId: string, clientId: string) {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(
    process.env.CLIENT_PORTAL_SECRET ?? process.env.SESSION_SECRET ?? "dev-secret",
  );
  return new SignJWT({ tenantId, clientId, kind: "client_portal_access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== TEST_SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results: Array<{
      company: string;
      owner: { email: string; password: string };
      staff: Array<{ email: string; role: string; password: string }>;
      clients: Array<{ name: string; email: string; portalUrl: string }>;
    }> = [];

    for (const company of TEST_COMPANIES) {
      const existing = await prisma.tenant.findUnique({ where: { slug: company.slug } });
      if (existing) {
        await prisma.tenant.delete({ where: { id: existing.id } });
      }

      const ownerPassword = `TestPass!${randomBytes(4).toString("hex")}`;
      const ownerHash = await hashPassword(ownerPassword);

      const tenant = await prisma.tenant.create({
        data: {
          name: company.name,
          slug: company.slug,
          status: "ACTIVE",
          accessMode: "READ_WRITE",
          billingEmail: company.ownerEmail,
          ownerName: company.ownerName,
          ownerEmail: company.ownerEmail,
          creditProvider: "CREDIT_HERO",
        },
      });

      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: company.ownerEmail,
          name: company.ownerName,
          role: UserRole.OWNER,
          status: "ACTIVE",
          passwordHash: ownerHash,
        },
      });

      await prisma.billingSubscription.create({
        data: {
          tenantId: tenant.id,
          planKey: "starter",
          status: "ACTIVE",
          includedTokenAllowance: 50,
          staffSeatLimit: 5,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          metadataJson: { mode: "test", source: "test-seed" },
        },
      });

      await prisma.tokenAccount.create({
        data: {
          tenantId: tenant.id,
          includedBalance: 50,
          purchasedBalance: 0,
        },
      });

      const staffResults = [];
      for (const member of company.staff) {
        const password = `TestPass!${randomBytes(4).toString("hex")}`;
        const hash = await hashPassword(password);
        await prisma.user.create({
          data: {
            tenantId: tenant.id,
            email: member.email,
            name: member.name,
            role: member.role,
            status: "ACTIVE",
            passwordHash: hash,
          },
        });
        staffResults.push({ email: member.email, role: member.role, password });
      }

      const clientResults = [];
      for (const clientData of company.clients) {
        const client = await prisma.client.create({
          data: {
            tenantId: tenant.id,
            firstName: clientData.firstName,
            lastName: clientData.lastName,
            email: clientData.email,
            phone: clientData.phone,
            lifecycleStage: ClientLifecycleStage.READY_FOR_STRATEGY,
            reportedIdentityTheft: false,
            disputedWithCreditBureaus: true,
            authorizedFtcIdentityTheftReport: false,
            authorizedCfpbComplaint: false,
            authorizedBbbComplaint: false,
          },
        });

        await prisma.intakeSubmission.create({
          data: {
            tenantId: tenant.id,
            clientId: client.id,
            source: "JOTFORM",
            rawPayloadJson: {
              name: `${clientData.firstName} ${clientData.lastName}`,
              email: clientData.email,
              phone: clientData.phone,
            },
            processedAt: new Date(),
          },
        });

        const disputeCase = await prisma.disputeCaseRecord.create({
          data: {
            tenantId: tenant.id,
            clientId: client.id,
            status: "ACTIVE",
            primaryGoal: "delete_or_correct",
            currentStage: "bureau",
          },
        });

        await prisma.disputeTradelineRecord.createMany({
          data: [
            {
              disputeCaseId: disputeCase.id,
              bureau: "Equifax",
              targetType: "creditor",
              accountNumberMasked: "****1234",
              accountType: "revolving",
              theoryPrimary: "account_not_mine",
              remedyPrimary: "deletion",
              furnisherName: "Equifax",
              collectorName: "Portfolio Recovery",
              originalCreditor: "Chase",
              balance: 2340,
              scoresJson: {},
              status: "DISPUTED",
            },
            {
              disputeCaseId: disputeCase.id,
              bureau: "TransUnion",
              targetType: "creditor",
              accountNumberMasked: "****5678",
              accountType: "revolving",
              theoryPrimary: "never_late",
              remedyPrimary: "correction",
              furnisherName: "TransUnion",
              collectorName: "Enhanced Recovery",
              originalCreditor: "Capital One",
              balance: 1870,
              scoresJson: {},
              status: "NEW",
            },
          ],
        });

        const token = await makeClientPortalToken(tenant.id, client.id);
        const appUrl = process.env.APP_BASE_URL ?? "https://credit-lounge-academy.vercel.app";
        clientResults.push({
          name: `${clientData.firstName} ${clientData.lastName}`,
          email: clientData.email,
          portalUrl: `${appUrl}/client/${token}`,
        });
      }

      results.push({
        company: company.name,
        owner: { email: company.ownerEmail, password: ownerPassword },
        staff: staffResults,
        clients: clientResults,
      });
    }

    return NextResponse.json({ ok: true, companies: results });
  } catch (error) {
    return NextResponse.json(
      { error: "Seed failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
