"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PipelineProgress } from "@/components/record/pipeline-progress";
import { Button } from "@/components/ui/button";
import { usePipeline, type PipelineState } from "@/lib/client/use-pipeline";
import type { PipelineStep, SessionStatus } from "@/lib/types";

/**
 * Session page for a session that isn't ready: failed (show error + Retry) or still processing
 * (e.g. the uploader closed the tab mid-way). Retry/Resume continues from `resumeStep`.
 */
export function ProcessingPanel({
  sessionId,
  status,
  resumeStep,
}: {
  sessionId: string;
  status: SessionStatus;
  resumeStep: PipelineStep;
}) {
  const router = useRouter();
  const { state, resume } = usePipeline();
  const [started, setStarted] = useState(false);

  const shown: PipelineState = started
    ? state
    : status === "failed"
      ? { status: "failed", stage: resumeStep, error: "Processing stopped before this session's mindmap was finished.", sessionId }
      : { status: "running", stage: resumeStep };

  const run = async () => {
    setStarted(true);
    if (await resume(sessionId, resumeStep)) router.refresh();
  };

  useEffect(() => {
    if (state.status === "done") router.refresh();
  }, [state.status, router]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-8">
      <h2 className="font-semibold text-2xl text-sidebar-selected">
        {status === "failed" && !started ? "This session didn't finish processing" : "Building the mindmap"}
      </h2>
      <PipelineProgress
        state={shown}
        action={
          <Button onClick={run} className="shrink-0 px-6">
            Retry
          </Button>
        }
      />
      {status === "processing" && !started && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-klarify-cloud-200 bg-klarify-cloud-50 px-4 py-3">
          <p className="text-klarify-neutral-600 text-sm">
            If this was started in another window that&apos;s since closed, you can pick it up here.
          </p>
          <Button variant="outline" onClick={run} className="shrink-0 px-5">
            Resume
          </Button>
        </div>
      )}
    </div>
  );
}
