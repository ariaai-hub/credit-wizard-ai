"use client";

import { useState, useRef } from "react";
import { markMailed } from "./actions";

const MAIL_COST_REGULAR = 4;
const MAIL_COST_CERTIFIED = 10;

type Props = {
  clientId: string;
  tenantId: string;
  tenantName: string;
  mailPreference: string;
  defaultMailType: string;
  remainingBalance: number;
};

export function MailQueueActions({
  clientId,
  tenantId,
  tenantName,
  mailPreference,
  defaultMailType,
  remainingBalance,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "mailed" | "no-balance" | "no-tracking">("idle");
  const [trackingInput, setTrackingInput] = useState("");
  const [showTracking, setShowTracking] = useState(false);
  const effectiveMailType = mailPreference || defaultMailType || "REGULAR";
  const tokenCost = effectiveMailType === "CERTIFIED" ? MAIL_COST_CERTIFIED : MAIL_COST_REGULAR;
  const isCertified = effectiveMailType === "CERTIFIED";
  const insufficientBalance = remainingBalance < tokenCost;

  async function handleMailed() {
    if (insufficientBalance) {
      setStatus("no-balance");
      return;
    }
    if (isCertified && !trackingInput.trim()) {
      setStatus("no-tracking");
      return;
    }
    setStatus("loading");
    const result = await markMailed(clientId, tenantId, isCertified ? trackingInput : null);
    if (result.ok) {
      setStatus("mailed");
    } else {
      setStatus("idle");
    }
  }

  if (status === "mailed") {
    return (
      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
        Mailed ✓
      </span>
    );
  }

  if (status === "no-balance") {
    return (
      <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
        No mailing balance
      </span>
    );
  }

  if (status === "no-tracking") {
    return (
      <div className="flex flex-col gap-2">
        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
          Tracking number required
        </span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            placeholder="Enter tracking #"
            className="w-36 rounded-xl border border-white/10 bg-[#091426] px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none"
          />
          <button
            onClick={handleMailed}
            className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 transition hover:border-sky-400 hover:bg-sky-500/20"
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {insufficientBalance && (
          <span className="text-xs text-rose-400">
            Needs {tokenCost} tokens ({remainingBalance} left)
          </span>
        )}
        {!showTracking && (
          <button
            onClick={() => {
              if (isCertified) {
                setShowTracking(true);
              } else {
                handleMailed();
              }
            }}
            disabled={status === "loading" || insufficientBalance}
            className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-300 transition hover:border-sky-400 hover:bg-sky-500/20 disabled:opacity-50"
          >
            {status === "loading" ? "Processing..." : `Mark as mailed (−${tokenCost})`}
          </button>
        )}
        {showTracking && (
          <button
            onClick={handleMailed}
            disabled={status === "loading"}
            className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-300 transition hover:border-sky-400 hover:bg-sky-500/20 disabled:opacity-50"
          >
            {status === "loading" ? "Processing..." : `Confirm (−${tokenCost})`}
          </button>
        )}
      </div>
      {showTracking && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            placeholder="Certified tracking number"
            className="w-48 rounded-xl border border-white/10 bg-[#091426] px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => setShowTracking(false)}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
