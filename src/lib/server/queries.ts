import { db, must } from "./db";
import type {
  Client,
  ClientGraph,
  ClientSummary,
  GraphEdge,
  GraphNode,
  NodeType,
  Occurrence,
  ReflectionQuestion,
  Session,
  SessionWithClient,
  Utterance,
} from "../types";

const SESSION_COLS = "id, client_id, session_number, session_date, status, failed_step, created_at";

type SessionRowWithClient = Session & { clients: { name: string } | null };
const withClientName = ({ clients, ...s }: SessionRowWithClient): SessionWithClient => ({
  ...s,
  client_name: clients?.name ?? "Unassigned",
});

// ---------- clients & sessions ----------

export async function listClients(): Promise<ClientSummary[]> {
  const [clients, sessions] = await Promise.all([
    db().from("clients").select("id, name, created_at").order("created_at"),
    db().from("sessions").select("client_id, created_at"),
  ]);
  const rows = must(sessions, "list sessions") as { client_id: string; created_at: string }[];
  return (must(clients, "list clients") as Client[]).map((c) => {
    const mine = rows.filter((s) => s.client_id === c.id).map((s) => s.created_at).sort();
    return { ...c, session_count: mine.length, last_session_at: mine.at(-1) ?? null };
  });
}

export async function getClient(id: string): Promise<ClientSummary | null> {
  if (!isUuid(id)) return null;
  return (await listClients()).find((c) => c.id === id) ?? null;
}

export async function listRecentSessions(): Promise<SessionWithClient[]> {
  const res = await db()
    .from("sessions")
    .select(`${SESSION_COLS}, clients(name)`)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });
  return (must(res, "list recent sessions") as unknown as SessionRowWithClient[]).map(withClientName);
}

export async function listClientSessions(clientId: string): Promise<Session[]> {
  if (!isUuid(clientId)) return [];
  const res = await db()
    .from("sessions")
    .select(SESSION_COLS)
    .eq("client_id", clientId)
    .order("session_number", { ascending: false });
  return must(res, "list client sessions") as Session[];
}

export async function getSession(id: string): Promise<SessionWithClient | null> {
  if (!isUuid(id)) return null;
  const res = await db().from("sessions").select(`${SESSION_COLS}, clients(name)`).eq("id", id).maybeSingle();
  const row = must(res, "get session") as unknown as SessionRowWithClient | null;
  return row ? withClientName(row) : null;
}

export function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// ---------- graph ----------

type NodeRow = {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  need_category: string | null;
  primary_narrative_id: string | null;
  first_session_id: string;
};
type OccurrenceRow = { node_id: string; session_id: string; summary: string[]; quotes: { utterance_index: number; text: string }[] };
type EdgeRow = { id: string; source_node_id: string; target_node_id: string; explanation: string; session_ids: string[] };

const CONTEXT_RADIUS = 3;

/**
 * Everything the maps and node modal need for one client: ready sessions, nodes with their
 * per-session occurrences (quotes carry surrounding context), edges and reflection questions.
 */
export async function getClientGraph(clientId: string): Promise<ClientGraph | null> {
  if (!isUuid(clientId)) return null;
  const client = must(
    await db().from("clients").select("id, name, created_at").eq("id", clientId).maybeSingle(),
    "get client",
  ) as Client | null;
  if (!client) return null;

  const sessionsRes = await db()
    .from("sessions")
    .select(`${SESSION_COLS}, utterances`)
    .eq("client_id", clientId)
    .eq("status", "ready")
    .order("session_number");
  const sessionRows = must(sessionsRes, "graph sessions") as (Session & { utterances: Utterance[] })[];
  const sessionIds = sessionRows.map((s) => s.id);
  const order = new Map(sessionRows.map((s, i) => [s.id, i]));
  const utterancesBySession = new Map(sessionRows.map((s) => [s.id, s.utterances]));

  const [nodesRes, occRes, edgesRes, qRes] = await Promise.all([
    db()
      .from("nodes")
      .select("id, type, label, description, need_category, primary_narrative_id, first_session_id")
      .eq("client_id", clientId)
      .order("created_at"),
    db().from("node_occurrences").select("node_id, session_id, summary, quotes").in("session_id", sessionIds),
    db()
      .from("edges")
      .select("id, source_node_id, target_node_id, explanation, session_ids")
      .eq("client_id", clientId),
    db()
      .from("reflection_questions")
      .select("id, session_id, node_id, text, source, created_at")
      .in("session_id", sessionIds)
      .order("created_at"),
  ]);

  const occByNode = new Map<string, Occurrence[]>();
  for (const o of must(occRes, "graph occurrences") as OccurrenceRow[]) {
    const utts = utterancesBySession.get(o.session_id) ?? [];
    const occ: Occurrence = {
      session_id: o.session_id,
      summary: o.summary,
      quotes: o.quotes.map((q) => ({
        ...q,
        timestamp_label: utts[q.utterance_index]?.timestamp_label ?? "",
        context: utts.slice(Math.max(0, q.utterance_index - CONTEXT_RADIUS), q.utterance_index + CONTEXT_RADIUS + 1),
      })),
    };
    occByNode.set(o.node_id, [...(occByNode.get(o.node_id) ?? []), occ]);
  }

  // Only nodes that appear in at least one ready session.
  const nodes: GraphNode[] = (must(nodesRes, "graph nodes") as NodeRow[])
    .filter((n) => occByNode.has(n.id))
    .map((n) => ({
      ...n,
      occurrences: occByNode.get(n.id)!.sort((a, b) => order.get(a.session_id)! - order.get(b.session_id)!),
    }));
  const nodeIds = new Set(nodes.map((n) => n.id));

  const edges: GraphEdge[] = (must(edgesRes, "graph edges") as EdgeRow[])
    .filter((e) => nodeIds.has(e.source_node_id) && nodeIds.has(e.target_node_id))
    .map((e) => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      explanation: e.explanation,
      session_ids: e.session_ids.filter((id) => order.has(id)),
    }))
    .filter((e) => e.session_ids.length > 0);

  return {
    client,
    sessions: sessionRows.map(({ id, client_id, session_number, session_date, status, failed_step, created_at }) => ({
      id,
      client_id,
      session_number,
      session_date,
      status,
      failed_step,
      created_at,
    })),
    nodes,
    edges,
    questions: must(qRes, "graph questions") as ReflectionQuestion[],
  };
}
