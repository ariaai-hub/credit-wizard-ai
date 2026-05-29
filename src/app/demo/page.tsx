"use client";

import { useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";

type DemoSectionKey = "overview" | "documents" | "disputes" | "mail" | "support" | "funding";

type TimelineItem = {
  id: string;
  title: string;
  time: string;
  detail: string;
  status: string;
};

type DocumentItem = {
  id: string;
  name: string;
  receivedAt: string;
  status: string;
  source: string;
  note: string;
};

type TradelineItem = {
  id: string;
  account: string;
  type: string;
  bureaus: string;
  amount: string;
  status: string;
  packet: string;
  note: string;
};

type MailItem = {
  id: string;
  title: string;
  time: string;
  status: string;
  detail: string;
};

type SupportMessage = {
  id: string;
  author: string;
  time: string;
  body: string;
  tone: "team" | "client";
};

const sections: { key: DemoSectionKey; label: string; caption: string }[] = [
  { key: "overview", label: "Overview", caption: "Current file state" },
  { key: "documents", label: "Documents", caption: "Received file inputs" },
  { key: "disputes", label: "Disputes", caption: "Prepared account work" },
  { key: "mail", label: "Mail", caption: "Outgoing delivery" },
  { key: "support", label: "Support", caption: "Client communication" },
  { key: "funding", label: "Funding", caption: "Readiness watch" },
];

const summaryStats = [
  { label: "Submitted", value: "8:42 AM" },
  { label: "Documents received", value: "8:47 AM" },
  { label: "Disputes mailed", value: "9:12 AM" },
  { label: "Portal", value: "Active" },
];

const profileFields = [
  { label: "Client", value: "Jane Doe" },
  { label: "Email", value: "jane.doe@sampleclient.co" },
  { label: "Address", value: "123 Wall St, Apt 8B, Atlanta, GA 30303" },
  { label: "File type", value: "Consumer credit file" },
];

const timeline: TimelineItem[] = [
  { id: "intake", title: "Intake submitted", time: "8:42 AM", detail: "The file was created and assigned.", status: "Complete" },
  { id: "portal", title: "Portal activated", time: "8:43 AM", detail: "Portal access was issued.", status: "Complete" },
  { id: "review", title: "Review completed", time: "8:46 AM", detail: "Negative items were identified and added to the file.", status: "Complete" },
  { id: "packet", title: "Dispute package prepared", time: "8:50 AM", detail: "Dispute and mailing files were prepared.", status: "Complete" },
  { id: "mail", title: "Disputes mailed", time: "9:12 AM", detail: "The dispute package was released to mail.", status: "Complete" },
];

const documents: DocumentItem[] = [
  { id: "license", name: "Driver License", receivedAt: "8:44 AM", status: "Complete", source: "Client Portal", note: "Identity document verified." },
  { id: "address", name: "Proof of Address", receivedAt: "8:45 AM", status: "Complete", source: "Client Portal", note: "Address matched the intake record." },
  { id: "ssn", name: "Social Security Card", receivedAt: "8:46 AM", status: "Complete", source: "Client Portal", note: "Identity support document added to the file." },
  { id: "report", name: "Credit Report PDF", receivedAt: "8:47 AM", status: "Imported", source: "Manual Upload", note: "Tradelines were extracted into the file." },
];

const tradelines: TradelineItem[] = [
  {
    id: "capital-one-auto",
    account: "Capital One Auto",
    type: "Late history",
    bureaus: "EX / EQ / TU",
    amount: "$6,420",
    status: "Prepared",
    packet: "Bureau dispute packet",
    note: "Late-payment history staged for the first mailing round.",
  },
  {
    id: "lvnv",
    account: "LVNV Funding",
    type: "Collection",
    bureaus: "EX / TU",
    amount: "$1,984",
    status: "Prepared",
    packet: "Collector validation lane",
    note: "Collection account queued with supporting file references.",
  },
  {
    id: "syncb",
    account: "SYNCB / Amazon",
    type: "Charge-off",
    bureaus: "EQ / EX",
    amount: "$912",
    status: "Prepared",
    packet: "Furnisher dispute lane",
    note: "Charge-off record packaged for the first dispute round.",
  },
];

const mailItems: MailItem[] = [
  { id: "print", title: "Print batch", time: "8:58 AM", status: "Complete", detail: "The dispute packet moved into print and prep." },
  { id: "postage", title: "Postage assigned", time: "9:04 AM", status: "Complete", detail: "Mail charges were assigned to the file." },
  { id: "handoff", title: "Mail handoff", time: "9:12 AM", status: "Complete", detail: "The packet cleared the outgoing mail run." },
];

const supportThread: SupportMessage[] = [
  { id: "team-1", author: "Support Team", time: "8:43 AM", body: "Your portal is active and your file is in review.", tone: "team" },
  { id: "client-1", author: "Jane Doe", time: "8:45 AM", body: "Documents have been uploaded.", tone: "client" },
  { id: "team-2", author: "Support Team", time: "8:49 AM", body: "Everything needed for the first pass is in the file.", tone: "team" },
  { id: "team-3", author: "Support Team", time: "9:13 AM", body: "The dispute package has been mailed and the file is now in monitoring.", tone: "team" },
];

const fundingSignals = [
  { label: "Current lane", value: "Watching" },
  { label: "Identity docs", value: "Complete" },
  { label: "Negative items", value: "3 found" },
  { label: "Deletion count", value: "0" },
];

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
      {label}
    </span>
  );
}

export default function DemoPage() {
  const [activeSection, setActiveSection] = useState<DemoSectionKey>("overview");
  const [selectedTimelineId, setSelectedTimelineId] = useState(timeline[2].id);
  const [selectedDocumentId, setSelectedDocumentId] = useState(documents[0].id);
  const [selectedTradelineId, setSelectedTradelineId] = useState(tradelines[0].id);

  const selectedTimeline = useMemo(
    () => timeline.find((item) => item.id === selectedTimelineId) ?? timeline[0],
    [selectedTimelineId],
  );

  const selectedDocument = useMemo(
    () => documents.find((item) => item.id === selectedDocumentId) ?? documents[0],
    [selectedDocumentId],
  );

  const selectedTradeline = useMemo(
    () => tradelines.find((item) => item.id === selectedTradelineId) ?? tradelines[0],
    [selectedTradelineId],
  );

  return (
    <main className="app-frame text-white">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-10">
        <div className="flex items-center justify-between gap-4 px-1 pb-5">
          <BrandLogo dark={false} href={undefined} />
          <div className="rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100 shadow-sm">
            Demo file
          </div>
        </div>

        <div className="public-surface overflow-hidden p-0">
          <div className="border-b border-white/10 bg-[#0a1324] px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Sample file</div>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Jane Doe</h1>
                <p className="mt-2 text-sm leading-7 text-slate-300">Interactive product walkthrough for a live-file style review.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {summaryStats.map((item) => (
                  <div key={item.label} className="public-surface-soft min-w-[140px] px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">{item.label}</div>
                    <div className="mt-2 text-base font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="border-b border-white/10 bg-[#08111f] p-4 lg:border-b-0 lg:border-r lg:border-r-white/10 lg:p-5">
              <div className="grid gap-2 lg:gap-1">
                {sections.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveSection(section.key)}
                    className={`rounded-2xl px-4 py-3 text-left transition ${
                      activeSection === section.key
                        ? "bg-sky-500 text-white shadow-[0_12px_30px_rgba(14,165,233,0.2)]"
                        : "bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="text-sm font-semibold">{section.label}</div>
                    <div className={`mt-1 text-xs ${activeSection === section.key ? "text-sky-100" : "text-slate-400"}`}>{section.caption}</div>
                  </button>
                ))}
              </div>

              <div className="mt-5 public-surface-soft p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Current status</div>
                <div className="mt-2 text-lg font-semibold text-white">Disputes mailed</div>
                <div className="mt-2 text-sm leading-7 text-slate-300">Documents were received, reviewed, and released to mail.</div>
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-[92%] rounded-full bg-gradient-to-r from-sky-400 to-blue-600" />
                </div>
              </div>
            </aside>

            <div className="bg-[#0b1629] p-4 sm:p-6">
              {activeSection === "overview" ? (
                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <section className="grid gap-6">
                    <article className="public-surface-soft p-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">File overview</div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {profileFields.map((field) => (
                          <div key={field.label} className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{field.label}</div>
                            <div className="mt-2 text-sm font-semibold text-white">{field.value}</div>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="public-surface-soft p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Activity</div>
                          <div className="mt-2 text-2xl font-semibold text-white">File history</div>
                        </div>
                        <StatusBadge label={selectedTimeline.status} />
                      </div>

                      <div className="mt-5 grid gap-3">
                        {timeline.map((item, index) => {
                          const isActive = item.id === selectedTimeline.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelectedTimelineId(item.id)}
                              className={`flex gap-4 rounded-[1.35rem] border p-4 text-left transition ${
                                isActive
                                  ? "border-sky-400/30 bg-sky-400/10"
                                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                              }`}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-sm font-semibold text-white">
                                {index + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-sm font-semibold text-white">{item.title}</div>
                                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.time}</div>
                                </div>
                                <div className="mt-2 text-sm leading-7 text-slate-300">{item.detail}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  </section>

                  <section className="grid gap-6">
                    <article className="public-surface-soft p-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Selected milestone</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{selectedTimeline.title}</div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-sm text-slate-300">Recorded at {selectedTimeline.time}</div>
                        <StatusBadge label={selectedTimeline.status} />
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-300">{selectedTimeline.detail}</p>
                    </article>

                    <article className="public-surface-soft p-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Client-facing state</div>
                      <div className="mt-2 text-2xl font-semibold text-white">Portal active</div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Docs</div>
                          <div className="mt-2 text-2xl font-semibold text-white">4 / 4</div>
                        </div>
                        <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Items found</div>
                          <div className="mt-2 text-2xl font-semibold text-white">3</div>
                        </div>
                        <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Disputes</div>
                          <div className="mt-2 text-2xl font-semibold text-white">Ready</div>
                        </div>
                        <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Funding</div>
                          <div className="mt-2 text-2xl font-semibold text-white">Watching</div>
                        </div>
                      </div>
                    </article>
                  </section>
                </div>
              ) : null}

              {activeSection === "documents" ? (
                <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
                  <article className="public-surface-soft p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Documents</div>
                    <div className="mt-2 text-2xl font-semibold text-white">Received file inputs</div>
                    <div className="mt-5 grid gap-3">
                      {documents.map((doc) => {
                        const isActive = doc.id === selectedDocument.id;
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setSelectedDocumentId(doc.id)}
                            className={`rounded-[1.35rem] border p-4 text-left transition ${
                              isActive
                                ? "border-sky-400/30 bg-sky-400/10"
                                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-white">{doc.name}</div>
                              <StatusBadge label={doc.status} />
                            </div>
                            <div className="mt-2 text-sm text-slate-300">{doc.receivedAt}</div>
                          </button>
                        );
                      })}
                    </div>
                  </article>

                  <article className="public-surface-soft p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Selected document</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{selectedDocument.name}</div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Status</div>
                        <div className="mt-2 text-base font-semibold text-white">{selectedDocument.status}</div>
                      </div>
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Received</div>
                        <div className="mt-2 text-base font-semibold text-white">{selectedDocument.receivedAt}</div>
                      </div>
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4 sm:col-span-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Source</div>
                        <div className="mt-2 text-base font-semibold text-white">{selectedDocument.source}</div>
                      </div>
                    </div>
                    <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">
                      {selectedDocument.note}
                    </div>
                  </article>
                </div>
              ) : null}

              {activeSection === "disputes" ? (
                <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                  <article className="public-surface-soft p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Disputes</div>
                    <div className="mt-2 text-2xl font-semibold text-white">Prepared account work</div>
                    <div className="mt-5 grid gap-3">
                      {tradelines.map((item) => {
                        const isActive = item.id === selectedTradeline.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedTradelineId(item.id)}
                            className={`rounded-[1.35rem] border p-4 text-left transition ${
                              isActive
                                ? "border-sky-400/30 bg-sky-400/10"
                                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-white">{item.account}</div>
                              <StatusBadge label={item.status} />
                            </div>
                            <div className="mt-2 text-sm text-slate-300">{item.type} • {item.bureaus}</div>
                            <div className="mt-1 text-sm text-slate-400">{item.amount}</div>
                          </button>
                        );
                      })}
                    </div>
                  </article>

                  <article className="public-surface-soft p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Selected account</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{selectedTradeline.account}</div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Type</div>
                        <div className="mt-2 text-base font-semibold text-white">{selectedTradeline.type}</div>
                      </div>
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Amount</div>
                        <div className="mt-2 text-base font-semibold text-white">{selectedTradeline.amount}</div>
                      </div>
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Bureaus</div>
                        <div className="mt-2 text-base font-semibold text-white">{selectedTradeline.bureaus}</div>
                      </div>
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Packet</div>
                        <div className="mt-2 text-base font-semibold text-white">{selectedTradeline.packet}</div>
                      </div>
                    </div>
                    <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">
                      {selectedTradeline.note}
                    </div>
                  </article>
                </div>
              ) : null}

              {activeSection === "mail" ? (
                <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                  <article className="public-surface-soft p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Mail</div>
                    <div className="mt-2 text-2xl font-semibold text-white">Outgoing delivery</div>
                    <div className="mt-5 grid gap-3">
                      {mailItems.map((item) => (
                        <div key={item.id} className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-white">{item.title}</div>
                            <StatusBadge label={item.status} />
                          </div>
                          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.time}</div>
                          <div className="mt-2 text-sm leading-7 text-slate-300">{item.detail}</div>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="public-surface-soft p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Delivery summary</div>
                    <div className="mt-2 text-2xl font-semibold text-white">Mail completed at 9:12 AM</div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Packet type</div>
                        <div className="mt-2 text-base font-semibold text-white">First-round dispute mail</div>
                      </div>
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Charge model</div>
                        <div className="mt-2 text-base font-semibold text-white">Mail billed separately</div>
                      </div>
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4 sm:col-span-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">File state</div>
                        <div className="mt-2 text-base font-semibold text-white">The file moved from preparation into mailed status with no missing document holds.</div>
                      </div>
                    </div>
                  </article>
                </div>
              ) : null}

              {activeSection === "support" ? (
                <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                  <article className="public-surface-soft p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Support</div>
                    <div className="mt-2 text-2xl font-semibold text-white">Client communication</div>
                    <div className="mt-5 grid gap-3">
                      {supportThread.map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-[1.35rem] border p-4 ${
                            message.tone === "team"
                              ? "border-sky-400/20 bg-sky-400/10"
                              : "border-white/10 bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-white">{message.author}</div>
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{message.time}</div>
                          </div>
                          <div className="mt-2 text-sm leading-7 text-slate-300">{message.body}</div>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="public-surface-soft p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Conversation summary</div>
                    <div className="mt-2 text-2xl font-semibold text-white">Support is current</div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Latest update</div>
                        <div className="mt-2 text-base font-semibold text-white">Dispute package mailed</div>
                      </div>
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Thread status</div>
                        <div className="mt-2 text-base font-semibold text-white">No open client reply</div>
                      </div>
                    </div>
                    <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">
                      The thread reads like a live support lane instead of a pitch page. Updates stay short, clear, and status-based.
                    </div>
                  </article>
                </div>
              ) : null}

              {activeSection === "funding" ? (
                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <article className="public-surface-soft p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Funding</div>
                    <div className="mt-2 text-2xl font-semibold text-white">Readiness watch</div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {fundingSignals.map((item) => (
                        <div key={item.label} className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</div>
                          <div className="mt-2 text-2xl font-semibold text-white">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="public-surface-soft p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Monitoring note</div>
                    <div className="mt-2 text-2xl font-semibold text-white">Not funding-ready yet</div>
                    <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">
                      Funding stays visible in the file, but it does not distract from the dispute workflow. The lane updates as file quality improves.
                    </div>
                  </article>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
