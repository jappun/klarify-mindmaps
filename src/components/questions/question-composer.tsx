"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Klarify's "Enter a new reflection question…" row: input + Add + Cancel.
 * `extra` renders beside the input (node picker / session select); `canSubmit` gates Add on it.
 */
export function QuestionComposer({
  onSubmit,
  extra,
  canSubmit = true,
  initialText = "",
  submitLabel = "Add",
  onCancel,
  autoFocus,
  className,
}: {
  onSubmit: (text: string) => Promise<boolean>;
  extra?: React.ReactNode;
  canSubmit?: boolean;
  initialText?: string;
  submitLabel?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const ready = !!text.trim() && canSubmit && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    const ok = await onSubmit(text.trim());
    setBusy(false);
    if (ok && !initialText) setText("");
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <input
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape" && onCancel) {
            e.stopPropagation();
            onCancel();
          }
        }}
        placeholder="Enter a new reflection question..."
        className="h-12 min-w-0 flex-1 rounded-lg border border-klarify-neutral-300 bg-white px-4 text-base text-klarify-neutral-900 outline-none transition-colors placeholder:text-klarify-neutral-500 focus:border-klarify-gray-mod-800 focus:ring-1 focus:ring-klarify-gray-mod-800"
      />
      {extra}
      <Button onClick={submit} disabled={!ready} className="h-12 w-28 text-base">
        {submitLabel}
      </Button>
      <Button
        variant="ghost"
        className="h-12 px-5 text-base"
        onClick={() => {
          setText(initialText);
          onCancel?.();
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
