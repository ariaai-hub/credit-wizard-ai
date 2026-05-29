/**
 * Stripe billing portal — Credit Wizard AI B2C (consumer) + B2B platform.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY              — Stripe secret key
 *   STRIPE_PORTAL_CONFIG_ID        — Stripe billing portal configuration (optional)
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

function getBaseUrl(request: Request) {
  const envBaseUrl = process.env.APP_BASE_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, "");
  }

  const originHeader = request.headers.get("origin")?.trim();
  if (originHeader) {
    return originHeader.replace(/\/$/, "");
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

async function createBillingPortal(request: Request): Promise<{ portalUrl: string }> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: session.tenantId },
    select: {
      id: true,
      stripeCustomerId: true,
      slug: true,
      billingEmail: true,
      name: true,
    },
  });

  if (!tenant.stripeCustomerId) {
    throw new Error("No billing account found for this user.");
  }

  const stripe = getStripe();
  const baseUrl = getBaseUrl(request);

  const portal = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${baseUrl}/dashboard/billing`,
    configuration: process.env.STRIPE_PORTAL_CONFIG_ID?.trim() || undefined,
  });

  return { portalUrl: portal.url };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { returnUrl?: string };
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: session.tenantId },
      select: {
        id: true,
        stripeCustomerId: true,
        slug: true,
        billingEmail: true,
        name: true,
      },
    });

    if (!tenant.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account found." }, { status: 400 });
    }

    const stripe = getStripe();
    const baseUrl = getBaseUrl(request);
    const returnUrl = body.returnUrl ?? `${baseUrl}/dashboard/billing`;

    const portal = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl,
      configuration: process.env.STRIPE_PORTAL_CONFIG_ID?.trim() || undefined,
    });

    return NextResponse.json({ portalUrl: portal.url });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown billing portal error." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);

  try {
    const { portalUrl } = await createBillingPortal(request);
    return NextResponse.redirect(portalUrl, 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown billing portal error.";

    if (message === "Unauthorized") {
      return NextResponse.redirect(`${baseUrl}/sign-in`, 303);
    }

    const redirectUrl = new URL(`${baseUrl}/dashboard/billing`);
    redirectUrl.searchParams.set("portalError", message);
    return NextResponse.redirect(redirectUrl, 303);
  }
}
