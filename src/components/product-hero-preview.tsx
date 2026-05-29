const fulfillmentStats = [
  { label: "Onboarding", value: "Auto" },
  { label: "Disputes", value: "Live" },
  { label: "Mail", value: "Tracked" },
  { label: "Updates", value: "24/7" },
];

const workflowRows = [
  "Docs received, missing items flagged, follow-up already sent.",
  "Dispute package prepared, mail queued, progress visible.",
  "Results posted, client updated, next step already moving.",
];

export function ProductHeroPreview() {
  return (
    <div className="lux-device p-5 sm:p-6 text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Fulfillment center</div>
          <div className="mt-2 text-xl font-semibold text-white">Everything that happens after the close</div>
        </div>
        <span className="lux-live-dot">Active</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {fulfillmentStats.map((item) => (
          <div key={item.label} className="rounded-[1.15rem] border border-white/10 bg-white/[0.05] px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300">{item.label}</div>
            <div className="mt-2 text-2xl font-semibold text-white">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300">What your team sees</div>
        <div className="mt-3 grid gap-3">
          {workflowRows.map((row) => (
            <div key={row} className="rounded-[1rem] border border-white/10 bg-[#0b1830] px-4 py-3 text-sm text-slate-200">
              {row}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300">Client experience</div>
          <div className="mt-3 text-lg font-semibold text-white">The client sees movement instead of silence.</div>
          <div className="mt-3 text-sm leading-7 text-slate-300">
            That lowers panic, reduces support drag, and makes the service feel more real after the sale.
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300">Why agencies care</div>
          <div className="mt-3 text-lg font-semibold text-white">Your team stops living in follow-up mode.</div>
          <div className="mt-3 text-sm leading-7 text-slate-300">
            Status handling, mailed-notice updates, and progress visibility stop depending on manual cleanup.
          </div>
        </div>
      </div>
    </div>
  );
}
