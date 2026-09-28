"use client";

import { Pencil, Trash2 } from "lucide-react";

// Pencil + trash icons from Klarify's Reflection Questions tab.
export function QuestionActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-6">
      <button type="button" aria-label="Edit question" onClick={onEdit} className="text-klarify-neutral-600 hover:text-klarify-neutral-900">
        <Pencil size={20} strokeWidth={1.6} />
      </button>
      <button
        type="button"
        aria-label="Delete question"
        onClick={onDelete}
        className="text-klarify-neutral-600 hover:text-klarify-rose-600"
      >
        <Trash2 size={20} strokeWidth={1.6} />
      </button>
    </div>
  );
}
