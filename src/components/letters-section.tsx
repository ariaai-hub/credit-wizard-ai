"use client";

import { useState, useCallback } from "react";
import { UpgradeModal } from "@/components/upgrade-modal";

interface Letter {
  id: string;
  bureau: string;
  furnisherName: string | null;
  accountType: string;
  accountNumberMasked: string;
  balance: number | null;
  letterText: string | null;
  status: string;
}

interface LettersSectionProps {
  letters: Letter[];
  token: string;
  initialDownloadInfo: {
    allowed: boolean;
    reason: "unlimited" | "available" | "limit_reached" | "upgrade_required" | null;
    downloadsUsed: number | null;
    downloadsLimit: number | null;
    downloadsRemaining: number | null;
  };
  plan: string | null;
}

function BureauBadge({ bureau }: { bureau: string }) {
  const colors: Record<string, string> = {
    EQUIFAX: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    EXPERIAN: "border-green-500/40 bg-green-500/10 text-green-300",
    TRANSUNION: "border-purple-500/40 bg-purple-500/10 text-purple-300",
  };
  const cls = colors[bureau] ?? "border-white/10 bg-white/5 text-slate-300";
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {bureau}
    </span>
  );
}

function DownloadBadge({ downloadInfo, plan }: { downloadInfo: LettersSectionProps["initialDownloadInfo"]; plan: string | null }) {
  if (!plan || plan === "STARTER") {
    const { downloadsUsed = 0, downloadsLimit = 3, reason, downloadsRemaining = 0 } = downloadInfo;
    if (reason === "limit_reached") {
      return (
        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
          Limit reached · Upgrade for unlimited
        </span>
      );
    }
    return (
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
        {downloadsRemaining} download{downloadsRemaining === 1 ? "" : "s"} left this month
      </span>
    );
  }
  return (
    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
      Unlimited downloads
    </span>
  );
}

export function LettersSection({ letters, token, initialDownloadInfo, plan }: LettersSectionProps) {
  const [downloadInfo, setDownloadInfo] = useState(initialDownloadInfo);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadError, setDownloadError] = useState<Record<string, string>>({});

  const isStarter = !plan || plan === "STARTER";
  const canDownload = downloadInfo.allowed || !isStarter;

  async function handleDownload(letter: Letter) {
    if (!letter.letterText) return;

    setDownloadingIds((prev) => new Set(prev).add(letter.id));
    setDownloadError((prev) => ({ ...prev, [letter.id]: "" }));

    try {
      const res = await fetch("/api/client/download-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letterId: letter.id, token }),
      });

      if (res.status === 402 || res.headers.get("content-type")?.includes("json")) {
        const data = await res.json();
        if (data.allowed === false) {
          if (data.reason === "limit_reached" || data.reason === "upgrade_required") {
            setDownloadInfo((prev) => ({
              ...prev,
              allowed: false,
              reason: data.reason,
              downloadsUsed: data.downloadsUsed ?? prev.downloadsUsed,
              downloadsLimit: data.downloadsLimit ?? prev.downloadsLimit,
              downloadsRemaining: data.downloadsRemaining ?? prev.downloadsRemaining,
            }));
            setShowUpgradeModal(true);
          }
          return;
        }
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDownloadError((prev) => ({ ...prev, [letter.id]: data.error ?? "Download failed." }));
        return;
      }

      // Trigger browser download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dispute-letter-${letter.furnisherName?.replace(/\s+/g, "-") ?? "letter"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Refresh download info
      const statusRes = await fetch(`/api/client/download-status?token=${encodeURIComponent(token)}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setDownloadInfo({
          allowed: statusData.allowed,
          reason: statusData.reason,
          downloadsUsed: statusData.downloadsUsed,
          downloadsLimit: statusData.downloadsLimit,
          downloadsRemaining: statusData.downloadsRemaining,
        });
      }
    } catch {
      setDownloadError((prev) => ({ ...prev, [letter.id]: "Network error. Please try again." }));
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(letter.id);
        return next;
      });
    }
  }

  if (letters.length === 0) {
    return null;
  }

  return (
    <>
      <section className="px-4 pb-6 sm:px-6 md:px-10 bg-transparent">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">My dispute letters</h2>
              <p className="mt-1 text-sm text-slate-400">
                Download and print your dispute letters to mail to the credit bureaus.
              </p>
            </div>
            <DownloadBadge downloadInfo={downloadInfo} plan={plan} />
          </div>

          {/* Download limit warning for Starter */}
          {isStarter && downloadInfo.reason !== "limit_reached" && downloadInfo.downloadsRemaining !== null && (downloadInfo.downloadsRemaining as number) <= 1 && (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-3 text-sm text-amber-300">
              You have {downloadInfo.downloadsRemaining} download{(downloadInfo.downloadsRemaining as number) === 1 ? "" : "s"} remaining this month.{" "}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="underline hover:no-underline"
              >
                Upgrade to Pro
              </button>{" "}
              for unlimited letters.
            </div>
          )}

          <div className="mt-5 grid gap-4">
            {letters.map((letter) => (
              <article
                key={letter.id}
                className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <BureauBadge bureau={letter.bureau} />
                    <div>
                      <span className="font-semibold text-white">{letter.furnisherName ?? "Creditor"}</span>
                      <span className="ml-3 text-sm text-slate-400">
                        {letter.accountType} · ****{letter.accountNumberMasked?.slice(-4) ?? "0000"}
                        {letter.balance !== null && letter.balance > 0 && ` · $${letter.balance.toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {letter.letterText ? (
                      <>
                        {isStarter && downloadInfo.reason === "limit_reached" ? (
                          <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                          >
                            Upgrade to download
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDownload(letter)}
                            disabled={downloadingIds.has(letter.id)}
                            className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
                          >
                            {downloadingIds.has(letter.id) ? "Preparing..." : "Download PDF"}
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-500">
                        Letter pending
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        letter.status === "NEW"
                          ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {letter.status}
                    </span>
                  </div>
                </div>

                {/* Letter preview */}
                {letter.letterText && (
                  <div className="px-5 py-4">
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400 font-mono border border-white/5 rounded-xl p-3 bg-white/[0.02]">
                      {letter.letterText.slice(0, 600)}
                      {letter.letterText.length > 600 && "..."}
                    </pre>
                    {downloadError[letter.id] && (
                      <p className="mt-2 text-xs text-rose-400">{downloadError[letter.id]}</p>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentDownloadsUsed={downloadInfo.downloadsUsed ?? 0}
        downloadsLimit={downloadInfo.downloadsLimit ?? 3}
        onSuccess={() => {
          setDownloadInfo((prev) => ({ ...prev, allowed: true, reason: "unlimited" }));
        }}
      />
    </>
  );
}
