// Pure pipeline logic (no I/O): validation, quote verification, merge planning.
import { randomUUID } from "node:crypto";
import type { NodeType, Utterance } from "../../types";
import type { Candidate, Extraction, MergeResult, Reflections } from "./schemas";

const QUOTE_MAX_WORDS = 20;

// ---------- Step A ----------

export function validateExtraction(ex: Extraction): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const n of ex.nodes) {
    if (ids.has(n.temp_id)) errors.push(`Duplicate temp_id "${n.temp_id}".`);
    ids.add(n.temp_id);
  }
  const byId = new Map(ex.nodes.map((n) => [n.temp_id, n]));
  for (const e of ex.edges) {
    if (!byId.has(e.source_temp_id)) errors.push(`Edge source "${e.source_temp_id}" is not a node temp_id.`);
    if (!byId.has(e.target_temp_id)) errors.push(`Edge target "${e.target_temp_id}" is not a node temp_id.`);
  }
  if (!ex.nodes.some((n) => n.type === "narrative")) errors.push("There must be at least one narrative node.");

  const narrativeNeighbors = new Map<string, number>();
  for (const e of ex.edges) {
    const s = byId.get(e.source_temp_id);
    const t = byId.get(e.target_temp_id);
    if (!s || !t) continue;
    if (t.type === "narrative") narrativeNeighbors.set(s.temp_id, 1);
    if (s.type === "narrative") narrativeNeighbors.set(t.temp_id, 1);
  }
  for (const n of ex.nodes) {
    if (n.type !== "narrative" && !narrativeNeighbors.has(n.temp_id)) {
      errors.push(`Node "${n.temp_id}" (${n.label}) does not connect to any narrative.`);
    }
  }
  return errors;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .trim();

function firstWords(text: string, n = QUOTE_MAX_WORDS) {
  const words = text.split(/\s+/);
  return words.length <= n ? text : `${words.slice(0, n).join(" ")}…`;
}

/**
 * Every quote must be traceable to a client utterance. If the text isn't found in the referenced
 * utterance, look for it in other client utterances; failing that, fall back to the first ~20 words
 * of the referenced utterance (if it's the client's). Quotes that can't be traced are dropped.
 */
export function verifyQuotes(
  quotes: { utterance_index: number; text: string }[],
  utterances: Utterance[],
  clientSpeaker: string | null,
): { utterance_index: number; text: string }[] {
  const isClient = (u: Utterance | undefined) => !!u && (clientSpeaker ? u.speaker === clientSpeaker : true);
  const out: { utterance_index: number; text: string }[] = [];

  for (const q of quotes) {
    const needle = norm(q.text.replace(/…$/, ""));
    const ref = utterances[q.utterance_index];
    let result: { utterance_index: number; text: string } | null = null;

    if (needle && isClient(ref) && norm(ref.text).includes(needle)) {
      result = { utterance_index: ref.index, text: q.text.trim() };
    } else {
      const found = needle ? utterances.find((u) => isClient(u) && norm(u.text).includes(needle)) : undefined;
      if (found) result = { utterance_index: found.index, text: q.text.trim() };
      else if (isClient(ref)) result = { utterance_index: ref.index, text: firstWords(ref.text) };
    }
    if (result && !out.some((o) => o.utterance_index === result.utterance_index)) out.push(result);
  }
  return out;
}

const MINOR_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with"]);

/** Klarify-style Title Case: "Numbing With Wine" → "Numbing with Wine". First/last words stay capitalized. */
export function titleCase(label: string) {
  const words = label.trim().split(/\s+/);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && i < words.length - 1 && MINOR_WORDS.has(lower)) return lower;
      return w[0].toUpperCase() + w.slice(1);
    })
    .join(" ");
}

/** Verify quotes, normalize labels, and drop edges that duplicate another pair or loop to themselves. */
export function cleanExtraction(ex: Extraction, utterances: Utterance[], clientSpeaker: string | null): Extraction {
  const nodes = ex.nodes.map((n) => ({
    ...n,
    label: titleCase(n.label),
    need_category: n.type === "need" ? n.need_category : null,
    quotes: verifyQuotes(n.quotes, utterances, clientSpeaker),
  }));
  const seen = new Set<string>();
  const edges = ex.edges.filter((e) => {
    if (e.source_temp_id === e.target_temp_id) return false;
    const key = [e.source_temp_id, e.target_temp_id].sort().join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { nodes, edges };
}

// ---------- Step B ----------

export type ExistingNode = {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  primary_narrative_id: string | null;
};
export type ExistingEdge = { id: string; source_node_id: string; target_node_id: string; session_ids: string[] };

export function validateMerge(result: MergeResult, candidates: Candidate[], existing: ExistingNode[]): string[] {
  const errors: string[] = [];
  const existingById = new Map(existing.map((n) => [n.id, n]));
  const candById = new Map(candidates.map((c) => [c.temp_id, c]));
  const seen = new Set<string>();

  for (const d of result.decisions) {
    const cand = candById.get(d.temp_id);
    if (!cand) {
      errors.push(`Decision for unknown temp_id "${d.temp_id}".`);
      continue;
    }
    if (seen.has(d.temp_id)) errors.push(`More than one decision for "${d.temp_id}".`);
    seen.add(d.temp_id);

    if (d.action === "match") {
      const target = d.existing_id ? existingById.get(d.existing_id) : undefined;
      if (!target) errors.push(`"${d.temp_id}" matches unknown existing_id "${d.existing_id}".`);
      else if (target.type !== cand.type)
        errors.push(`"${d.temp_id}" (${cand.type}) cannot match "${target.id}" (${target.type}); types must be equal.`);
    }
    if (cand.type !== "narrative") {
      const p = d.primary_narrative_id;
      const ok =
        !!p &&
        ((existingById.get(p)?.type === "narrative") || candById.get(p)?.type === "narrative");
      if (!ok) errors.push(`"${d.temp_id}" needs primary_narrative_id set to a narrative's id or temp_id (got "${p}").`);
    }
  }
  for (const c of candidates) if (!seen.has(c.temp_id)) errors.push(`Missing decision for "${c.temp_id}".`);
  return errors;
}

/** For a client's first session: every candidate is new; primary narrative comes from the edges. */
export function firstSessionDecisions(ex: Extraction): MergeResult {
  return {
    decisions: ex.nodes.map((n) => ({
      temp_id: n.temp_id,
      action: "new" as const,
      existing_id: null,
      primary_narrative_id: n.type === "narrative" ? null : narrativeFromEdges(n.temp_id, ex),
    })),
  };
}

function narrativeFromEdges(tempId: string, ex: Extraction): string | null {
  const byId = new Map(ex.nodes.map((n) => [n.temp_id, n]));
  for (const e of ex.edges) {
    const other = e.source_temp_id === tempId ? e.target_temp_id : e.target_temp_id === tempId ? e.source_temp_id : null;
    if (other && byId.get(other)?.type === "narrative") return other;
  }
  return ex.nodes.find((n) => n.type === "narrative")?.temp_id ?? null;
}

export type MergePlan = {
  nodesToInsert: {
    id: string;
    client_id: string;
    type: NodeType;
    label: string;
    description: string;
    need_category: string | null;
    primary_narrative_id: string | null;
    first_session_id: string;
  }[];
  occurrences: { node_id: string; session_id: string; summary: string[]; quotes: { utterance_index: number; text: string }[] }[];
  primaryUpdates: { id: string; primary_narrative_id: string }[];
  edgesToInsert: { client_id: string; source_node_id: string; target_node_id: string; explanation: string; session_ids: string[] }[];
  edgesToTouch: { id: string; session_ids: string[] }[];
  /** temp_id → final node id */
  idMap: Record<string, string>;
};

export function planMerge({
  clientId,
  sessionId,
  extraction,
  decisions,
  existingNodes,
  existingEdges,
  newId = randomUUID,
}: {
  clientId: string;
  sessionId: string;
  extraction: Extraction;
  decisions: MergeResult;
  existingNodes: ExistingNode[];
  existingEdges: ExistingEdge[];
  newId?: () => string;
}): MergePlan {
  const decisionFor = new Map(decisions.decisions.map((d) => [d.temp_id, d]));
  const existingById = new Map(existingNodes.map((n) => [n.id, n]));

  // 1. temp_id → final id
  const idMap: Record<string, string> = {};
  for (const c of extraction.nodes) {
    const d = decisionFor.get(c.temp_id);
    idMap[c.temp_id] = d?.action === "match" && d.existing_id && existingById.has(d.existing_id) ? d.existing_id : newId();
  }
  const resolvePrimary = (p: string | null | undefined) => (p ? (idMap[p] ?? (existingById.has(p) ? p : null)) : null);

  // 2. New nodes (narratives first so self-references resolve on insert).
  const nodesToInsert: MergePlan["nodesToInsert"] = [];
  const primaryUpdates: MergePlan["primaryUpdates"] = [];
  const created = new Set<string>();
  const sorted = [...extraction.nodes].sort((a, b) => Number(b.type === "narrative") - Number(a.type === "narrative"));
  for (const c of sorted) {
    const id = idMap[c.temp_id];
    const primary = c.type === "narrative" ? null : resolvePrimary(decisionFor.get(c.temp_id)?.primary_narrative_id);
    if (existingById.has(id)) {
      // Keep matched nodes' clusters stable: only fill in a missing primary narrative.
      if (primary && !existingById.get(id)!.primary_narrative_id) primaryUpdates.push({ id, primary_narrative_id: primary });
      continue;
    }
    if (created.has(id)) continue;
    created.add(id);
    nodesToInsert.push({
      id,
      client_id: clientId,
      type: c.type,
      label: c.label,
      description: c.description,
      need_category: c.type === "need" ? c.need_category : null,
      primary_narrative_id: primary === id ? null : primary,
      first_session_id: sessionId,
    });
  }

  // 3. Occurrences, merged when several candidates map to one node.
  const occ = new Map<string, MergePlan["occurrences"][number]>();
  for (const c of extraction.nodes) {
    const id = idMap[c.temp_id];
    const o = occ.get(id) ?? { node_id: id, session_id: sessionId, summary: [], quotes: [] };
    o.summary.push(...c.summary.filter((s) => !o.summary.includes(s)));
    for (const q of c.quotes) if (!o.quotes.some((x) => x.utterance_index === q.utterance_index)) o.quotes.push(q);
    occ.set(id, o);
  }

  // 4. Edges: remap, drop self-loops, dedupe against existing (unordered pairs).
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const existingByPair = new Map(existingEdges.map((e) => [pairKey(e.source_node_id, e.target_node_id), e]));
  const edgesToInsert: MergePlan["edgesToInsert"] = [];
  const edgesToTouch: MergePlan["edgesToTouch"] = [];
  const handled = new Set<string>();
  for (const e of extraction.edges) {
    const s = idMap[e.source_temp_id];
    const t = idMap[e.target_temp_id];
    if (!s || !t || s === t) continue;
    const key = pairKey(s, t);
    if (handled.has(key)) continue;
    handled.add(key);
    const prior = existingByPair.get(key);
    if (prior) {
      if (!prior.session_ids.includes(sessionId)) edgesToTouch.push({ id: prior.id, session_ids: [...prior.session_ids, sessionId] });
    } else {
      edgesToInsert.push({ client_id: clientId, source_node_id: s, target_node_id: t, explanation: e.explanation, session_ids: [sessionId] });
    }
  }

  return { nodesToInsert, occurrences: [...occ.values()], primaryUpdates, edgesToInsert, edgesToTouch, idMap };
}

// ---------- Step C ----------

export function validateReflections(r: Reflections, nodeIds: Set<string>): string[] {
  const errors: string[] = [];
  for (const q of r.questions) {
    if (!nodeIds.has(q.node_id)) errors.push(`node_id "${q.node_id}" is not one of this session's nodes.`);
    if (!q.text.trim().endsWith("?")) errors.push(`Question should end with "?": "${q.text}"`);
  }
  return errors;
}
