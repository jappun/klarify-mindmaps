"use client";

import { Check, CircleAlert, Loader2 } from "lucide-react";
import { STAGES, type PipelineState } from "@/lib/client/use-pipeline";
import { cn } from "@/lib/utils";

const BARS = 10;

/**
 * Processing state: Klarify's 10-bar progress indicator (from the Records rows) above
 * the step labels. Failed steps show the error and whatever action the caller passes.
 */
export function PipelineProgress({ state, action }: { state: PipelineState; action?: React.ReactNode }) {
  const idx =
    state.status === "done" ? STAGES.length : state.status === "idle" ? -1 : STAGES.findIndex((s) => s.key === state.stage);
  const filled = state.status === "done" ? BARS : Math.max(1, Math.round(((idx + 0.5) / STAGES.length) * BARS));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-nowrap font-normal text-sm",
            state.status === "failed" ? "text-klarify-rose-600" : "text-klarify-forest-500",
          )}
        >
          {state.status === "done" ? "Done!" : state.status === "failed" ? "Stopped" : "Processing…"}
        </span>
        <div className="flex h-4 items-center gap-1">
          {Array.from({ length: BARS }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-full w-0.5 rounded-full transition-colors duration-500",
                i < filled ? (state.status === "failed" ? "bg-klarify-rose-400" : "bg-klarify-forest-500") : "bg-klarify-cloud-300",
              )}
            />
          ))}
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {STAGES.map((s, i) => {
          const done = i < idx;
          const current = i === idx && state.status === "running";
          const failed = i === idx && state.status === "failed";
          return (
            <li key={s.key} className="flex items-center gap-3 text-base">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                {done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-klarify-forest-500 text-white">
                    <Check size={13} strokeWidth={3} />
                  </span>
                ) : current ? (
                  <Loader2 size={18} className="animate-spin text-klarify-ocean-500" />
                ) : failed ? (
                  <CircleAlert size={20} className="text-klarify-rose-600" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-klarify-cloud-400" />
                )}
              </span>
              <span
                className={cn(
                  done && "text-klarify-neutral-500",
                  current && "font-medium text-klarify-neutral-900",
                  failed && "font-medium text-klarify-rose-700",
                  !done && !current && !failed && "text-klarify-neutral-400",
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {state.status === "failed" && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-klarify-rose-200 bg-klarify-rose-50 px-4 py-3">
          <p className="text-klarify-rose-700 text-sm">{state.error}</p>
          {action}
        </div>
      )}
    </div>
  );
}
