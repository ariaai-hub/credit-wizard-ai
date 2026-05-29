"use client";

import { useState, useCallback } from "react";
import { createKnowledgeBaseEntry, updateKnowledgeBaseEntry, deleteKnowledgeBaseEntry } from "./actions";

type Entry = {
  id: string;
  question: string;
  answer: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
};

type Props = {
  initialEntries: Entry[];
  tenantId: string;
};

export function KnowledgeBaseClient({ initialEntries, tenantId }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ question: "", answer: "", category: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ question: "", answer: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories = Array.from(new Set(entries.map((e) => e.category).filter(Boolean))).sort();

  const filtered = entries.filter((e) => {
    const matchSearch =
      !search ||
      e.question.toLowerCase().includes(search.toLowerCase()) ||
      e.answer.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || e.category === filterCategory;
    return matchSearch && matchCat;
  });

  const handleAdd = async () => {
    if (!addForm.question.trim() || !addForm.answer.trim()) return;
    setSaving(true);
    const result = await createKnowledgeBaseEntry({ ...addForm, tenantId });
    if (result.ok && result.entry) {
      setEntries((prev) => [result.entry!, ...prev]);
      setAddForm({ question: "", answer: "", category: "" });
      setShowAdd(false);
    }
    setSaving(false);
  };

  const handleEdit = (entry: Entry) => {
    setEditingId(entry.id);
    setEditForm({ question: entry.question, answer: entry.answer, category: entry.category });
  };

  const handleEditSave = async () => {
    if (!editingId || !editForm.question.trim() || !editForm.answer.trim()) return;
    setSaving(true);
    const result = await updateKnowledgeBaseEntry({ id: editingId, ...editForm });
    if (result.ok && result.entry) {
      setEntries((prev) => prev.map((e) => (e.id === editingId ? result.entry! : e)));
      setEditingId(null);
      setEditForm({ question: "", answer: "", category: "" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    setDeletingId(id);
    const result = await deleteKnowledgeBaseEntry({ id });
    if (result.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
    setDeletingId(null);
  };

  return (
    <div className="grid gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search questions and answers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none w-64"
        />
        {categories.length > 0 && (
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        <div className="ml-auto">
          <button
            onClick={() => { setShowAdd(true); setAddForm({ question: "", answer: "", category: "" }); }}
            className="rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-sky-300 hover:to-blue-400"
          >
            + Add entry
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="public-surface p-6">
          <h2 className="text-lg font-semibold text-white mb-4">New knowledge base entry</h2>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              Category
              <input
                type="text"
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                placeholder="e.g. onboarding, disputes, billing"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              Question
              <textarea
                value={addForm.question}
                onChange={(e) => setAddForm({ ...addForm, question: e.target.value })}
                rows={2}
                placeholder="What will the client ask?"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              Answer
              <textarea
                value={addForm.answer}
                onChange={(e) => setAddForm({ ...addForm, answer: e.target.value })}
                rows={4}
                placeholder="How should the AI respond?"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
              />
            </label>
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={saving || !addForm.question.trim() || !addForm.answer.trim()}
                className="rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:from-sky-300 hover:to-blue-400"
              >
                {saving ? "Saving..." : "Save entry"}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries list */}
      {filtered.length === 0 ? (
        <div className="public-surface p-12 text-center text-slate-500">
          No entries found. Try a different search or add a new entry.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((entry) => (
            <div key={entry.id} className="public-surface p-5">
              {editingId === entry.id ? (
                <div className="grid gap-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      placeholder="Category"
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none w-48"
                    />
                  </div>
                  <textarea
                    value={editForm.question}
                    onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                    rows={2}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
                  />
                  <textarea
                    value={editForm.answer}
                    onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                    rows={4}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleEditSave}
                      disabled={saving}
                      className="rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.category && (
                        <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-sky-300">
                          {entry.category}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-40"
                      >
                        {deletingId === entry.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-sm font-semibold text-white">{entry.question}</div>
                  <div className="mt-2 text-sm leading-relaxed text-slate-300">{entry.answer}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}