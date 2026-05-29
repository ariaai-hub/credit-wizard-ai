import { notFound } from "next/navigation";

import type { Plan } from "@prisma/client";

import { SubmitButton } from "@/components/submit-button";
import { ClientPortal } from "@/components/client-portal";
import { ChatWidget } from "@/components/chat-widget";
import { LettersSection } from "@/components/letters-section";
import {
  getClientPortalDocumentActivity,
  verifyClientPortalAccessToken,
} from "@/lib/client-access";
import { buildClientPortalViewModel } from "@/lib/client-portal";
import { getTenantIntegrationSnapshot } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";

import { submitClientPortalDocumentAction } from "./actions";

function formatSnapshotValue(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return null;
}

export default async function ClientPortalAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await verifyClientPortalAccessToken(token);
  if (!payload) notFound();

  const [
    client,
    tenant,
    integrationSnapshot,
    documentActivity,
    negativeItemCount,
    submittedDisputeCount,
    deletionCount,
    letters,
  ] = await Promise.all([
    prisma.client.findFirst({
      where: { id: payload.clientId, tenantId: payload.tenantId },
    }),
    prisma.tenant.findUnique({
      where: { id: payload.tenantId },
      select: { id: true, plan: true, letterDownloadsThisMonth: true, lastDownloadMonth: true },
    }),
    getTenantIntegrationSnapshot(payload.tenantId),
    getClientPortalDocumentActivity({ tenantId: payload.tenantId, clientId: payload.clientId }),
    prisma.disputeTradelineRecord.count({
      where: { disputeCase: { tenantId: payload.tenantId, clientId: payload.clientId } },
    }),
    prisma.disputeTradelineRecord.count({
      where: {
        disputeCase: { tenantId: payload.tenantId, clientId: payload.clientId },
        status: { in: ["DISPUTED", "MONITORING", "ESCALATED", "RESOLVED"] },
      },
    }),
    prisma.disputeTradelineRecord.count({
      where: {
        disputeCase: { tenantId: payload.tenantId, clientId: payload.clientId },
        responseClass: "deleted",
      },
    }),
    // Letters with letter text — only those that have been generated
    prisma.disputeTradelineRecord.findMany({
      where: {
        disputeCase: { tenantId: payload.tenantId, clientId: payload.clientId },
        letterText: { not: null },
        bureau: { not: "" },
      },
      select: {
        id: true,
        bureau: true,
        furnisherName: true,
        accountType: true,
        accountNumberMasked: true,
        balance: true,
        letterText: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!client) notFound();

  // Build letter download info from tenant
  const STARTER_LIMIT = 3;
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const tenantPlan = (tenant?.plan as Plan | null) ?? null;
  const isNewMonth = tenant?.lastDownloadMonth !== currentMonth;
  const downloadsUsed = isNewMonth ? 0 : (tenant?.letterDownloadsThisMonth ?? 0);
  const isProOrElite = tenantPlan === "PRO" || tenantPlan === "ELITE";

  const letterDownloadInfo = isProOrElite
    ? { allowed: true as const, reason: "unlimited" as const, downloadsUsed: null, downloadsLimit: null, downloadsRemaining: null }
    : tenantPlan === "STARTER"
    ? {
        allowed: downloadsUsed < STARTER_LIMIT,
        reason: downloadsUsed >= STARTER_LIMIT ? "limit_reached" as const : "available" as const,
        downloadsUsed,
        downloadsLimit: STARTER_LIMIT,
        downloadsRemaining: Math.max(STARTER_LIMIT - downloadsUsed, 0),
      }
    : { allowed: false as const, reason: "upgrade_required" as const, downloadsUsed: 0, downloadsLimit: 0, downloadsRemaining: 0 };

  const requiredDocumentTypes = ["identity_document", "proof_of_address", "credit_report"];
  const uploadedDocumentTypes = new Set(
    documentActivity
      .map((event) => {
        const input =
          event.inputSnapshotJson && typeof event.inputSnapshotJson === "object" && !Array.isArray(event.inputSnapshotJson)
            ? (event.inputSnapshotJson as Record<string, unknown>)
            : null;
        return typeof input?.documentType === "string" ? input.documentType : null;
      })
      .filter((v): v is string => Boolean(v)),
  );
  const documentCount = requiredDocumentTypes.filter((t) => uploadedDocumentTypes.has(t)).length;

  const creditProviderSystem = integrationSnapshot.systems.find((s) => s.key === "CREDIT_PROVIDER");
  const model = buildClientPortalViewModel({
    clientName: `${client.firstName} ${client.lastName}`.trim(),
    firstName: client.firstName,
    email: client.email,
    providerName: creditProviderSystem?.label ?? "Credit Hero",
    providerSignupUrl: client.creditProviderSignupUrl,
    lifecycleStage: client.lifecycleStage,
    providerStatus: client.creditProviderStatus,
    mailPreference: client.mailPreference,
    fundingInterestPersonal: false,
    fundingInterestBusiness: false,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    negativeItemCount,
    submittedDisputeCount,
    deletionCount,
    documentCount,
    requiredDocumentCount: requiredDocumentTypes.length,
    plan: tenantPlan,
    letterDownloadInfo,
  });

  const submitDocumentAction = submitClientPortalDocumentAction.bind(null, token);

  return (
    <>
      <ClientPortal model={model} previewLabel="Secure client portal" />

      {/* Floating chat widget — replaces old message support section */}
      <ChatWidget token={token} clientName={client.firstName} />

      {/* Letters section — download paywall */}
      <LettersSection
        letters={letters}
        token={token}
        initialDownloadInfo={letterDownloadInfo}
        plan={tenantPlan}
      />

      <section className="px-4 pb-6 sm:px-6 md:px-10 bg-transparent">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Send a document */}
          <article id="send-document" className="public-surface p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-white">Send a document</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Upload the requested file directly here so your onboarding and dispute work keep moving.
            </p>

            <form action={submitDocumentAction} className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-300">
                Document type
                <select
                  name="documentType"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none"
                >
                  <option value="identity_document">Identity document</option>
                  <option value="proof_of_address">Proof of address</option>
                  <option value="credit_report">Credit report</option>
                  <option value="supporting_document">Supporting document</option>
                  <option value="general_document">General document</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-300">
                Notes
                <textarea
                  name="notes"
                  rows={4}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
                  placeholder="Anything we should know about this document?"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-300">
                File
                <input
                  name="document"
                  type="file"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
              </label>

              <SubmitButton className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-5 py-3 text-sm font-semibold text-white hover:from-sky-300 hover:to-blue-400 shadow-sm">
                Upload document
              </SubmitButton>
            </form>
          </article>
        </div>
      </section>

      <section className="px-4 pb-10 sm:px-6 sm:pb-12 md:px-10 bg-transparent">
        <div className="mx-auto w-full max-w-6xl public-surface p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-white">Recent document activity</h2>
          {documentActivity.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-5 py-8 text-sm text-slate-400">
              No document uploads yet.
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {documentActivity.map((event) => {
                const input =
                  event.inputSnapshotJson && typeof event.inputSnapshotJson === "object" && !Array.isArray(event.inputSnapshotJson)
                    ? (event.inputSnapshotJson as Record<string, unknown>)
                    : null;
                const output =
                  event.outputSnapshotJson && typeof event.outputSnapshotJson === "object" && !Array.isArray(event.outputSnapshotJson)
                    ? (event.outputSnapshotJson as Record<string, unknown>)
                    : null;
                return (
                  <article className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {event.createdAt.toLocaleString()}
                    </div>
                    <div className="mt-2 text-base font-semibold text-white">
                      {formatSnapshotValue(input?.documentType) ?? "Document submitted"}
                    </div>
                    {formatSnapshotValue(input?.notes) ? (
                      <p className="mt-2 text-sm leading-7 text-slate-300">{formatSnapshotValue(input?.notes)}</p>
                    ) : null}
                    <div className="mt-3 text-sm text-slate-400">
                      File:{" "}
                      <span className="font-medium text-white">
                        {formatSnapshotValue(input?.originalFileName) ?? "Unknown"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      Stored:{" "}
                      <span className="font-medium text-white">
                        {formatSnapshotValue(output?.storedFileName) ?? "Pending"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
