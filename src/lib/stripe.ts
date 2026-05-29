import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }

  return stripeClient;
}

export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER ?? "",
  growth: process.env.STRIPE_PRICE_GROWTH ?? "",
  scale: process.env.STRIPE_PRICE_SCALE ?? "",
  token100: process.env.STRIPE_PRICE_TOKEN_100 ?? "",
  token300: process.env.STRIPE_PRICE_TOKEN_300 ?? "",
  token1000: process.env.STRIPE_PRICE_TOKEN_1000 ?? "",
  pro: process.env.STRIPE_PRICE_PRO ?? "",
  elite: process.env.STRIPE_PRICE_ELITE ?? "",
} as const;

export function getStripeConfigStatus() {
  const missing = Object.entries(STRIPE_PRICE_IDS)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
    hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    hasPortalConfiguration: Boolean(process.env.STRIPE_SECRET_KEY),
    missingPriceIds: missing,
    billingPortalReturnUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  };
}
