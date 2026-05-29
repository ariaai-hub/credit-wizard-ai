"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------- Shared types ----------

export type KnowledgeBaseEntry = {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ---------- Server actions ----------

export type KbActionState = {
  ok: boolean;
  message: string;
  entry?: KnowledgeBaseEntry;
};

export async function getKnowledgeBaseEntries(tenantId: string): Promise<KnowledgeBaseEntry[]> {
  return prisma.knowledgeBaseEntry.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createKnowledgeBaseEntry(input: {
  tenantId: string;
  question: string;
  answer: string;
  category: string;
}): Promise<{ ok: boolean; entry?: KnowledgeBaseEntry; message: string }> {
  try {
    const session = await requireSession();
    if (session.role !== "OWNER") {
      return { ok: false, message: "Only company owners can manage the knowledge base." };
    }

    if (!input.question.trim() || !input.answer.trim()) {
      return { ok: false, message: "Question and answer are required." };
    }

    const entry = await prisma.knowledgeBaseEntry.create({
      data: {
        tenantId: session.tenantId,
        question: input.question.trim(),
        answer: input.answer.trim(),
        category: input.category.trim() || "general",
      },
    });

    revalidatePath("/dashboard/knowledge-base");
    return { ok: true, entry, message: "Entry created." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to create entry." };
  }
}

export async function updateKnowledgeBaseEntry(input: {
  id: string;
  question: string;
  answer: string;
  category: string;
}): Promise<{ ok: boolean; entry?: KnowledgeBaseEntry; message: string }> {
  try {
    const session = await requireSession();
    if (session.role !== "OWNER") {
      return { ok: false, message: "Only company owners can manage the knowledge base." };
    }

    if (!input.question.trim() || !input.answer.trim()) {
      return { ok: false, message: "Question and answer are required." };
    }

    const entry = await prisma.knowledgeBaseEntry.update({
      where: { id: input.id },
      data: {
        question: input.question.trim(),
        answer: input.answer.trim(),
        category: input.category.trim() || "general",
      },
    });

    revalidatePath("/dashboard/knowledge-base");
    return { ok: true, entry, message: "Entry updated." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to update entry." };
  }
}

export async function deleteKnowledgeBaseEntry(input: {
  id: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const session = await requireSession();
    if (session.role !== "OWNER") {
      return { ok: false, message: "Only company owners can manage the knowledge base." };
    }

    await prisma.knowledgeBaseEntry.deleteMany({
      where: { id: input.id, tenantId: session.tenantId },
    });

    revalidatePath("/dashboard/knowledge-base");
    return { ok: true, message: "Entry deleted." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to delete entry." };
  }
}