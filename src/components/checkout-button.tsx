"use client";

import { useState } from "react";

type CheckoutButtonProps = {
  label: string;
  payload: { planKey?: string; tokenPack?: "100" | "300" | "1000" };
  variant?: "primary" | "secondary";
};

export function CheckoutButton({ label, payload, variant = "primary" }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const classes = variant === "primary" ? "lux-button-primary" : "lux-button-secondary";

  async function handleClick() {
    try {
      setLoading(true);
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Checkout request failed.");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={classes}
    >
      {loading ? "Opening checkout..." : label}
    </button>
  );
}
