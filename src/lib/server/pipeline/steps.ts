// Pipeline steps with DB side effects. Each step saves its output before the next starts,
// and each is idempotent so a retry can resume from the failed step.
import { db, must } from "../db";
import { generateStructured } from "../gemini";
import { parseTranscript, utterancesForPrompt } from "../../transcript";
import type { NodeType, PipelineStep, Utterance } from "../../types";
import {
  cleanExtraction,
  firstSessionDecisions,
  planMerge,
  validateExtraction,
  validateMerge,
  validateReflections,
  type ExistingEdge,
  type ExistingNode,
} from "./logic";
import { extractPrompt, mergePrompt, reflectionsPrompt } from "./prompts";
import { extractionSchema, mergeSchema, reflectionsSchema, type Extraction } from "./schemas";

type SessionRecord = {
  id: string;
  client_id: string;
  session_number: number;
  utterances: Utterance[];
  client_speaker: string | null;
  extraction: Extraction | null;
};

async function loadSession(id: string): Promise<SessionRecord> {
  const res = await db()
    .from("sessions")
    .select("id, client_id, session_number, utterances, client_speaker, extraction")
    .eq("id", id)
    .single();
  return must(res, "load session") as SessionRecord;
}

// ---------- create ----------

export async function createSession({
  transcript,
  clientId,
  newClientName,
  sessionDate,
  createdAt,
}: {
  transcript: string;
  clientId?: string;
  newClientName?: string;
  sessionDate: string;
  createdAt?: string;
}): Promise<{ sessionId: string; clientId: string }> {
  const parsed = parseTranscript(transcript); // throws TranscriptParseError on bad input

  let cid = clientId;
  if (!cid) {
    if (!newClientName?.trim()) throw new Error("A client is required.");
    const row = must(
      await db()
        .from("clients")
        .insert({ name: newClientName.trim(), ...(createdAt ? { created_at: createdAt } : {}) })
        .select("id")
        .single(),
      "create client",
    ) as { id: string };
    cid = row.id;
  }

  const last = must(
    await db().from("sessions").select("session_number").eq("client_id", cid).order("session_number", { ascending: false }).limit(1),
    "next session number",
  ) as { session_number: number }[];

  const row = must(
    await db()
      .from("sessions")
      .insert({
        client_id: cid,
        session_number: (last[0]?.session_number ?? 0) + 1,
        session_date: sessionDate,
        status: "processing",
        raw_transcript: transcript,
        utterances: parsed.utterances,
        client_speaker: parsed.clientSpeaker,
        ...(createdAt ? { created_at: createdAt } : {}),
      })
      .select("id")
      .single(),
    "create session",
  ) as { id: string };

  return { sessionId: row.id, clientId: cid };
}

// ---------- step runner ----------

const STEPS: Record<PipelineStep, (id: string) => Promise<void>> = {
  extract: runExtract,
  merge: runMerge,
  reflections: runReflections,
};

/** Run one step, recording failure on the session so the client can retry from here. */
export async function runStep(sessionId: string, step: PipelineStep) {
  await db().from("sessions").update({ status: "processing", failed_step: null }).eq("id", sessionId);
  try {
    await STEPS[step](sessionId);
  } catch (err) {
    await db().from("sessions").update({ status: "failed", failed_step: step }).eq("id", sessionId);
    throw err;
  }
}

// ---------- Step A: extract ----------

async function runExtract(sessionId: string) {
  const s = await loadSession(sessionId);
  const raw = await generateStructured({
    label: "extract",
    prompt: extractPrompt({ transcript: utterancesForPrompt(s.utterances), clientSpeaker: s.client_speaker }),
    schema: extractionSchema,
    validate: validateExtraction,
  });
  const extraction = cleanExtraction(raw, s.utterances, s.client_speaker);
  must(await db().from("sessions").update({ extraction }).eq("id", sessionId).select("id"), "save extraction");
}

// ---------- Step B: merge ----------

/** Remove anything a previous (possibly partial) merge of this session wrote. */
async function undoMerge(sessionId: string, clientId: string) {
  must(await db().from("reflection_questions").delete().eq("session_id", sessionId).select("id"), "undo questions");
  must(await db().from("nodes").delete().eq("first_session_id", sessionId).select("id"), "undo nodes");
  must(await db().from("node_occurrences").delete().eq("session_id", sessionId).select("id"), "undo occurrences");
  const touched = must(
    await db().from("edges").select("id, session_ids").eq("client_id", clientId).contains("session_ids", [sessionId]),
    "undo edges: find",
  ) as { id: string; session_ids: string[] }[];
  for (const e of touched) {
    const rest = e.session_ids.filter((x) => x !== sessionId);
    if (rest.length) must(await db().from("edges").update({ session_ids: rest }).eq("id", e.id).select("id"), "undo edge");
    else must(await db().from("edges").delete().eq("id", e.id).select("id"), "undo edge");
  }
}

async function runMerge(sessionId: string) {
  const s = await loadSession(sessionId);
  if (!s.extraction) throw new Error("No extraction saved for this session; run extract first.");
  await undoMerge(sessionId, s.client_id);

  const [nodesRes, edgesRes] = await Promise.all([
    db().from("nodes").select("id, type, label, description, primary_narrative_id").eq("client_id", s.client_id),
    db().from("edges").select("id, source_node_id, target_node_id, session_ids").eq("client_id", s.client_id),
  ]);
  const existingNodes = must(nodesRes, "existing nodes") as ExistingNode[];
  const existingEdges = must(edgesRes, "existing edges") as ExistingEdge[];
  const candidates = s.extraction.nodes;

  // Latest summary per existing node, so the model can judge what each theme is really about.
  const latestSummary = new Map<string, string[]>();
  if (existingNodes.length) {
    const occ = must(
      await db()
        .from("node_occurrences")
        .select("node_id, summary, sessions(session_number)")
        .in("node_id", existingNodes.map((n) => n.id)),
      "existing summaries",
    ) as unknown as { node_id: string; summary: string[]; sessions: { session_number: number } }[];
    for (const o of occ.sort((a, b) => a.sessions.session_number - b.sessions.session_number)) latestSummary.set(o.node_id, o.summary);
  }

  const decisions =
    existingNodes.length === 0
      ? firstSessionDecisions(s.extraction)
      : await generateStructured({
          label: "merge",
          prompt: mergePrompt({
            existing: existingNodes.map(({ id, type, label, description }) => ({
              id,
              type,
              label,
              description,
              summary: latestSummary.get(id) ?? [],
            })),
            candidates: candidates.map((c) => ({
              temp_id: c.temp_id,
              type: c.type,
              label: c.label,
              description: c.description,
              summary: c.summary,
              connects_to: s.extraction!.edges.flatMap((e) =>
                e.source_temp_id === c.temp_id ? [e.target_temp_id] : e.target_temp_id === c.temp_id ? [e.source_temp_id] : [],
              ),
            })),
          }),
          schema: mergeSchema,
          validate: (r) => validateMerge(r, candidates, existingNodes),
        });

  const plan = planMerge({
    clientId: s.client_id,
    sessionId,
    extraction: s.extraction,
    decisions,
    existingNodes,
    existingEdges,
  });

  const narratives = plan.nodesToInsert.filter((n) => n.type === "narrative");
  const others = plan.nodesToInsert.filter((n) => n.type !== "narrative");
  if (narratives.length) must(await db().from("nodes").insert(narratives).select("id"), "insert narratives");
  if (others.length) must(await db().from("nodes").insert(others).select("id"), "insert nodes");
  for (const u of plan.primaryUpdates) {
    must(await db().from("nodes").update({ primary_narrative_id: u.primary_narrative_id }).eq("id", u.id).select("id"), "update primary");
  }
  if (plan.occurrences.length) must(await db().from("node_occurrences").insert(plan.occurrences).select("id"), "insert occurrences");
  if (plan.edgesToInsert.length) must(await db().from("edges").insert(plan.edgesToInsert).select("id"), "insert edges");
  for (const e of plan.edgesToTouch) {
    must(await db().from("edges").update({ session_ids: e.session_ids }).eq("id", e.id).select("id"), "update edge");
  }
}

// ---------- Step C: reflections ----------

async function runReflections(sessionId: string) {
  const occ = must(
    await db()
      .from("node_occurrences")
      .select("summary, nodes(id, type, label, description)")
      .eq("session_id", sessionId),
    "session nodes",
  ) as unknown as { summary: string[]; nodes: { id: string; type: NodeType; label: string; description: string } }[];
  if (occ.length === 0) throw new Error("This session has no merged nodes; run merge first.");

  const nodes = occ.map((o) => ({ ...o.nodes, summary: o.summary }));
  const ids = new Set(nodes.map((n) => n.id));
  const result = await generateStructured({
    label: "reflections",
    prompt: reflectionsPrompt({ nodes }),
    schema: reflectionsSchema,
    validate: (r) => validateReflections(r, ids),
  });

  must(await db().from("reflection_questions").delete().eq("session_id", sessionId).eq("source", "ai").select("id"), "clear ai questions");
  must(
    await db()
      .from("reflection_questions")
      .insert(result.questions.map((q) => ({ session_id: sessionId, node_id: q.node_id, text: q.text.trim(), source: "ai" })))
      .select("id"),
    "insert questions",
  );
  must(await db().from("sessions").update({ status: "ready", failed_step: null }).eq("id", sessionId).select("id"), "mark ready");
}
