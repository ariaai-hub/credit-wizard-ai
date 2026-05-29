import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/dashboard-nav";

const CATEGORY_LABELS: Record<string, string> = {
  "email-sequences": "📧 Email Sequences",
  "social-swipe": "📱 Social Media Swipe Files",
  "referral-templates": "🔗 Referral Program Templates",
  "lead-magnets": "🧲 Lead Magnet Builder",
  "compliance-kit": "⚖️ Compliance Kit",
  "ad-copy": "📣 Ad Copy (5 Variations)",
};

const CATEGORY_COLORS: Record<string, string> = {
  "email-sequences": "text-sky-300 border-sky-400/20 bg-sky-400/5",
  "social-swipe": "text-violet-300 border-violet-400/20 bg-violet-400/5",
  "referral-templates": "text-emerald-300 border-emerald-400/20 bg-emerald-400/5",
  "lead-magnets": "text-amber-300 border-amber-400/20 bg-amber-400/5",
  "compliance-kit": "text-rose-300 border-rose-400/20 bg-rose-400/5",
  "ad-copy": "text-blue-300 border-blue-400/20 bg-blue-400/5",
};

export default async function EliteContentPage() {
  const session = await requireSession();
  const { userId, email, role, tenantId } = session;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, plan: true },
  });

  if (tenant?.plan !== "ELITE") {
    redirect("/dashboard");
  }

  const items = await prisma.eliteContent.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const totalItems = items.length;

  return (
    <div className="app-frame text-white min-h-screen flex flex-col">
      <DashboardNav role={role} email={email} plan={tenant?.plan ?? null} />
      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 mb-3">
            ELITE CONTENT
          </div>
          <h1 className="text-3xl font-semibold text-white">Business-in-a-Box</h1>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl">
            Everything you need to run your own credit repair business — email sequences, social media swipe files, ad copy, compliance docs, and more. All yours as an Elite member.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Assets", value: totalItems, sub: "downloadable pieces" },
            { label: "Categories", value: Object.keys(grouped).length, sub: "content types" },
            { label: "Your Plan", value: "Elite ✓", sub: "full access unlocked" },
          ].map((stat) => (
            <div key={stat.label} className="public-surface p-5">
              <div className="text-2xl font-semibold text-white">{stat.value}</div>
              <div className="text-xs font-medium text-white mt-1">{stat.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Content by category */}
        {totalItems === 0 ? (
          <div className="public-surface p-12 text-center">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="text-lg font-semibold text-white">Content coming soon</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
              Elite content assets are being prepared. Check back soon — or contact support if you need something specific.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, categoryItems]) => {
              const colorClass = CATEGORY_COLORS[category] ?? "text-slate-300 border-white/10 bg-white/5";
              return (
                <section key={category} className="public-surface p-6">
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold mb-4 ${colorClass.split(" ").slice(0, 2).join(" ")}`}>
                    {CATEGORY_LABELS[category] ?? category}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="public-surface-soft p-4 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{item.title}</div>
                            {item.description && (
                              <p className="mt-1 text-xs text-slate-400 line-clamp-2">{item.description}</p>
                            )}
                            {item.tags && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.split(",").map((tag) => (
                                  <span key={tag} className="text-[10px] rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-slate-400">
                                    {tag.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {/* TODO: copy or download */}}
                            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                            title="Copy content"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-8 rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 text-center">
          <p className="text-xs text-amber-200/80">
            💡 These assets are yours to use freely as an Elite member. Customize them with your own branding and start generating leads immediately.
          </p>
        </div>
      </main>
    </div>
  );
}
