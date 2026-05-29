import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getKnowledgeBaseEntries } from "./actions";
import { KnowledgeBaseClient } from "./knowledge-base-client";

export default async function KnowledgeBasePage() {
  const session = await requireSession();

  if (session.role !== "OWNER") {
    redirect("/dashboard");
  }

  const entries = await getKnowledgeBaseEntries(session.tenantId);

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="public-surface flex flex-col gap-4 p-8 md:p-10 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="lux-label">Knowledge Base</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              FAQ &amp; Answers
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Manage the answers your AI assistant uses to respond to client questions.
            </p>
          </div>
          <div className="text-sm text-slate-500 md:text-right">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </div>
        </header>

        <KnowledgeBaseClient
          initialEntries={entries}
          tenantId={session.tenantId}
        />
      </div>
    </main>
  );
}