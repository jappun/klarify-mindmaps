"use client";

import { useCallback, useState } from "react";
import { PIPELINE_STEPS, type PipelineStep } from "../types";

export type Stage = "create" | PipelineStep;
export const STAGES: { key: Stage; label: string }[] = [
  { key: "create", label: "Reading transcript…" },
  { key: "extract", label: "Finding themes…" },
  { key: "merge", label: "Merging with previous sessions…" },
  { key: "reflections", label: "Writing reflection questions…" },
];

export type PipelineState =
  | { status: "idle" }
  | { status: "running"; stage: Stage }
  | { status: "failed"; stage: Stage; error: string; sessionId?: string }
  | { status: "done"; sessionId: string };

/** Runs the pipeline step by step from the browser so each server call stays short (SPEC §10.5). */
export function usePipeline() {
  const [state, setState] = useState<PipelineState>({ status: "idle" });

  const runSteps = useCallback(async (sessionId: string, from: PipelineStep = "extract") => {
    for (const step of PIPELINE_STEPS.slice(PIPELINE_STEPS.indexOf(from))) {
      setState({ status: "running", stage: step });
      const res = await fetch(`/api/sessions/${sessionId}/${step}`, { method: "POST" }).catch(() => null);
      const json = res ? await res.json().catch(() => ({})) : {};
      if (!res?.ok) {
        const error = res ? (json.error ?? "Something went wrong.") : "Couldn't reach the server. Check your connection.";
        setState({ status: "failed", stage: step, error, sessionId });
        return false;
      }
    }
    setState({ status: "done", sessionId });
    return true;
  }, []);

  const start = useCallback(
    async (body: { transcript: string; clientId?: string; newClientName?: string; sessionDate: string; acknowledged: true }) => {
      setState({ status: "running", stage: "create" });
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => null);
      const json = res ? await res.json().catch(() => ({})) : {};
      if (!res?.ok) {
        setState({ status: "failed", stage: "create", error: json.error ?? "Couldn't create the session." });
        return null;
      }
      const ok = await runSteps(json.sessionId);
      return ok ? (json.sessionId as string) : null;
    },
    [runSteps],
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, start, resume: runSteps, reset };
}
