import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { getClientPortalDocumentActivity } from "@/lib/client-access";
import { buildClientPortalViewModel } from "@/lib/client-portal";
import { getTenantIntegrationSnapshot } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { buildReportEligibilityStatus } from "@/lib/report-eligibility";
import { formatStageLabel } from "@/lib/company-workspace";

function InfoPill({ label, value }: { label: string; value: string | boolean | null }) {
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : value ?? "—";
  const isYes = value === true;
  const isNo = value === false;
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${isYes ? "text-emerald-300" : isNo ? "text-rose-300" : "text-white"}`}>
        {display}
      </span>
    </div>
  );
}

export default async function DashboardClientPreviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await requireSession();
  const { clientId } = await params;

  const [client, integrationSnapshot, documentActivity, negativeItemCount, submittedDisputeCount, deletionCount] =
    await Promise.all([
      prisma.client.findFirst({
        where: { id: clientId, tenantId: session.tenantId },
      }),
      getTenantIntegrationSnapshot(session.tenantId),
      getClientPortalDocumentActivity({ tenantId: session.tenantId, clientId }),
      prisma.disputeTradelineRecord.count({
        where: { disputeCase: { tenantId: session.tenantId, clientId } },
      }),
      prisma.disputeTradelineRecord.count({
        where: {
          disputeCase: { tenantId: session.tenantId, clientId },
          status: { in: ["DISPUTED", "MONITORING", "ESCALATED", "RESOLVED"] },
        },
      }),
      prisma.disputeTradelineRecord.count({
        where: {
          disputeCase: { tenantId: session.tenantId, clientId },
          responseClass: "deleted",
        },
      }),
    ]);

  if (!client) notFound();

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
  });

  const reportEligibility = buildReportEligibilityStatus({
    reportedIdentityTheft: client.reportedIdentityTheft,
    identityTheftNarrative: client.identityTheftNarrative,
    disputedWithCreditBureaus: client.disputedWithCreditBureaus,
    authorizedFtcIdentityTheftReport: client.authorizedFtcIdentityTheftReport,
    authorizedCfpbComplaint: client.authorizedCfpbComplaint,
    authorizedBbbComplaint: client.authorizedBbbComplaint,
  });

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

        {/* Header — matches clients page structure */}
        <header className="public-surface flex items-start justify-between gap-4 p-8 md:p-10">
          <div>
            <div className="lux-label">Client record</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              {client.firstName} {client.lastName}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              {client.email || "No email on file"} · {client.phone || "No phone on file"}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {formatStageLabel(client.lifecycleStage)}
              </span>
            </div>
            {client.onboardingCompletedAt ? (
              <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                Onboarding complete
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300">
                Pending onboarding
              </span>
            )}
          </div>
        </header>

        {/* Stats row — matches dashboard/intake pattern */}
        <section className="grid gap-4 sm:grid-cols-4">
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Negative items</div>
            <div className="mt-3 text-3xl font-semibold text-white">{negativeItemCount}</div>
          </div>
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Disputes filed</div>
            <div className="mt-3 text-3xl font-semibold text-white">{submittedDisputeCount}</div>
          </div>
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Items removed</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-400">{deletionCount}</div>
          </div>
          <div className="public-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-200">Docs uploaded</div>
            <div className="mt-3 text-3xl font-semibold text-white">
              {documentCount}
              <span className="text-base font-normal text-slate-400">/{requiredDocumentTypes.length}</span>
            </div>
          </div>
        </section>

        {/* Filing eligibility + Identity theft — two-column grid, matching clients page */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="public-surface p-6 md:p-8">
            <div className="lux-label">Filing eligibility</div>
            <h2 className="mt-3 text-xl font-semibold text-white">{reportEligibility.summaryLabel}</h2>
            <div className="mt-5 flex flex-col gap-2">
              <InfoPill label="Identity theft flagged" value={client.reportedIdentityTheft} />
              <InfoPill label="Prior disputes confirmed" value={client.disputedWithCreditBureaus} />
              <InfoPill label="FTC authorized" value={client.authorizedFtcIdentityTheftReport} />
              <InfoPill label="CFPB authorized" value={client.authorizedCfpbComplaint} />
              <InfoPill label="BBB authorized" value={client.authorizedBbbComplaint} />
            </div>
          </section>

          <section className="public-surface p-6 md:p-8">
            <div className="lux-label">Identity theft</div>
            <h2 className="mt-3 text-xl font-semibold text-white">
              {client.identityTheftNarrative?.trim() ? "Client statement" : "No narrative on file"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {client.identityTheftNarrative?.trim() ||
                "No identity theft narrative has been provided yet."}
            </p>
          </section>
        </div>

        {/* Documents section */}
        <section className="public-surface p-6 md:p-8">
          <div className="lux-label">Documents</div>
          <h2 className="mt-3 text-xl font-semibold text-white">Required documents</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { key: "identity_document", label: "Identity document" },
              { key: "proof_of_address", label: "Proof of address" },
              { key: "credit_report", label: "Credit report" },
            ].map(({ key, label }) => {
              const uploaded = uploadedDocumentTypes.has(key);
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
                    uploaded
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  <div className={`h-2 w-2 rounded-full ${uploaded ? "bg-emerald-400" : "bg-slate-600"}`} />
                  {label}
                </div>
              );
            })}
          </div>

          {documentActivity.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 text-sm font-semibold text-slate-300">Upload history</div>
              <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#091426]">
                <table className="min-w-full text-sm text-slate-200">
                  <thead className="bg-white/[0.04] text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Document</th>
                      <th className="px-4 py-3 font-medium">Date uploaded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {documentActivity.map((event) => {
                      const input =
                        event.inputSnapshotJson && typeof event.inputSnapshotJson === "object" && !Array.isArray(event.inputSnapshotJson)
                          ? (event.inputSnapshotJson as Record<string, unknown>)
                          : null;
                      return (
                        <tr key={event.id}>
                          <td className="px-4 py-3 text-slate-300">
                            {typeof input?.documentType === "string"
                              ? input.documentType.replace(/_/g, " ")
                              : "Document submitted"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(event.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Back link */}
        <div className="flex justify-start">
          <Link
            href="/dashboard/clients"
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            ← Back to clients
          </Link>
        </div>

      </div>
    </main>
  );
}
