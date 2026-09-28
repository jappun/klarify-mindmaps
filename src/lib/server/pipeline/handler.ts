import { isUuid } from "../queries";
import type { PipelineStep } from "../../types";
import { runStep } from "./steps";

/** Shared POST handler for /api/sessions/[id]/{extract,merge,reflections}. */
export async function handleStep(params: Promise<{ id: string }>, step: PipelineStep) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "Unknown session." }, { status: 404 });
  try {
    await runStep(id, step);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`[pipeline:${step}] session ${id}`, err);
    return Response.json({ error: friendlyError(err), step }, { status: 500 });
  }
}

function friendlyError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/timeout|aborted/i.test(msg)) return "The AI model took too long to respond.";
  if (/validation/i.test(msg)) return "The AI model returned something we couldn't use.";
  if (/429|quota|rate/i.test(msg)) return "The AI model is busy right now.";
  return "Something went wrong while processing this session.";
}
