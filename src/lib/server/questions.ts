import { db, must } from "./db";
import { isUuid } from "./queries";
import type { ReflectionQuestion } from "../types";

const COLS = "id, session_id, node_id, text, source, created_at";

export class QuestionError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** The node must belong to the same client as the session. */
async function assertSameClient(sessionId: string, nodeId: string) {
  if (!isUuid(sessionId) || !isUuid(nodeId)) throw new QuestionError("Unknown session or node.", 404);
  const [s, n] = await Promise.all([
    db().from("sessions").select("client_id").eq("id", sessionId).maybeSingle(),
    db().from("nodes").select("client_id").eq("id", nodeId).maybeSingle(),
  ]);
  const session = must(s, "question session") as { client_id: string } | null;
  const node = must(n, "question node") as { client_id: string } | null;
  if (!session || !node) throw new QuestionError("Unknown session or node.", 404);
  if (session.client_id !== node.client_id) throw new QuestionError("That node belongs to a different client.");
}

export async function createQuestion(input: { sessionId: string; nodeId: string; text: string }): Promise<ReflectionQuestion> {
  await assertSameClient(input.sessionId, input.nodeId);
  return must(
    await db()
      .from("reflection_questions")
      .insert({ session_id: input.sessionId, node_id: input.nodeId, text: input.text, source: "therapist" })
      .select(COLS)
      .single(),
    "create question",
  ) as ReflectionQuestion;
}

export async function updateQuestion(id: string, patch: { text?: string; nodeId?: string }): Promise<ReflectionQuestion> {
  if (!isUuid(id)) throw new QuestionError("Unknown question.", 404);
  const current = must(await db().from("reflection_questions").select(COLS).eq("id", id).maybeSingle(), "load question") as
    | ReflectionQuestion
    | null;
  if (!current) throw new QuestionError("Unknown question.", 404);
  if (patch.nodeId) await assertSameClient(current.session_id, patch.nodeId);
  return must(
    await db()
      .from("reflection_questions")
      .update({ ...(patch.text ? { text: patch.text } : {}), ...(patch.nodeId ? { node_id: patch.nodeId } : {}) })
      .eq("id", id)
      .select(COLS)
      .single(),
    "update question",
  ) as ReflectionQuestion;
}

export async function deleteQuestion(id: string) {
  if (!isUuid(id)) throw new QuestionError("Unknown question.", 404);
  must(await db().from("reflection_questions").delete().eq("id", id).select("id"), "delete question");
}

export function questionErrorResponse(err: unknown) {
  if (err instanceof QuestionError) return Response.json({ error: err.message }, { status: err.status });
  console.error("[questions]", err);
  return Response.json({ error: "Something went wrong." }, { status: 500 });
}
