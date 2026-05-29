import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  try {
    const stripe = getStripe();

    const products = [
      { name: "Starter", description: "Starter plan", price: 9.99, interval: "month" as const },
      { name: "Pro", description: "Pro plan", price: 59.99, interval: "month" as const },
      { name: "Elite", description: "Elite plan", price: 129.99, interval: "month" as const },
    ];

    const results: { plan: string; productId: string; priceId: string }[] = [];

    for (const p of products) {
      // Create or retrieve product
      const product = await stripe.products.create({
        name: `Credit Wizard - ${p.name}`,
        description: p.description,
      });

      // Create recurring price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(p.price * 100),
        currency: "usd",
        recurring: { interval: p.interval },
      });

      results.push({
        plan: p.name,
        productId: product.id,
        priceId: price.id,
      });

      console.log(`Created ${p.name}: product=${product.id}, price=${price.id}`);
    }

    return NextResponse.json({
      ok: true,
      message: "Stripe products created",
      products: results,
      note: "Set these price IDs in your STRIPE_PRICE_STARTER/PRO/ELITE env vars",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}