import { NextResponse } from "next/server";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { getSession } from "@/lib/auth";
import { PLAN_DEFINITIONS, TOKEN_PACKS } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { ensureStripeCustomerId } from "@/lib/stripe-customer";
import { getStripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

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

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (!["OWNER", "ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Only owners and admins can manage billing." }, { status: 403 });
    }
    const body = (await request.json()) as { planKey?: string; tokenPack?: "100" | "300" | "1000" };
    const stripe = getStripe();

    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: session.tenantId },
    });

    const plan = body.planKey ? PLAN_DEFINITIONS.find((entry) => entry.key === body.planKey) : null;
    const tokenPack = body.tokenPack ? TOKEN_PACKS.find((entry) => entry.tokens === Number(body.tokenPack)) : null;

    if (!plan && !tokenPack) {
      return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
    }

    const customerId = await ensureStripeCustomerId({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      billingEmail: tenant.billingEmail,
      stripeCustomerId: tenant.stripeCustomerId,
    });

    const baseUrl = getBaseUrl(request);

    if (plan) {
      const priceId = STRIPE_PRICE_IDS[plan.key];
      if (!priceId) {
        return NextResponse.json({ error: `Missing Stripe price ID for ${plan.key}.` }, { status: 400 });
      }

      const checkout = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        success_url: `${baseUrl}/dashboard/billing?checkout=success`,
        cancel_url: `${baseUrl}/dashboard/billing?checkout=cancelled`,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          checkoutType: "subscription",
          planKey: plan.key,
        },
      });

      return NextResponse.json({
        ok: true,
        url: checkout.url,
        sessionId: checkout.id,
      });
    }

    const tokenPriceMap = {
      100: STRIPE_PRICE_IDS.token100,
      300: STRIPE_PRICE_IDS.token300,
      1000: STRIPE_PRICE_IDS.token1000,
    } as const;

    const priceId = tokenPriceMap[tokenPack!.tokens as keyof typeof tokenPriceMap];

    if (!priceId) {
      return NextResponse.json({ error: `Missing Stripe price ID for ${tokenPack!.tokens} token pack.` }, { status: 400 });
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      success_url: `${baseUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${baseUrl}/dashboard/billing?checkout=cancelled`,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        checkoutType: "token_pack",
        tokenPack: String(tokenPack!.tokens),
      },
    });

    return NextResponse.json({
      ok: true,
      url: checkout.url,
      sessionId: checkout.id,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      const redirectUrl = getURLFromRedirectError(error);
      if (redirectUrl) {
        return NextResponse.json({ ok: true, url: redirectUrl, mode: "redirect" });
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown Stripe checkout error.",
      },
      { status: 500 },
    );
  }
}
