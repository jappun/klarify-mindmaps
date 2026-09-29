// Pure view model for the session-level map (SPEC §6).
import type { ClientGraph, GraphEdge, GraphNode, Session } from "../types";

export type SessionNode = GraphNode & {
  /** Appears in the session being viewed. */
  inSession: boolean;
  /** First appearance is the session being viewed (never true on a client's first session). */
  isNew: boolean;
  /** Session numbers (≤ current) this node appeared in. */
  sessionNumbers: number[];
};

export type SessionModel = {
  session: Session;
  nodes: SessionNode[];
  edges: GraphEdge[];
  sessionNumber: Map<string, number>;
  /** An earlier session exists, so "new" and "from other sessions" mean something. */
  hasEarlier: boolean;
};

/**
 * Nodes from this session or any earlier one. Nodes that first appear in later sessions are hidden,
 * and so are edges that only exist in later sessions.
 */
export function buildSessionModel(graph: ClientGraph, sessionId: string): SessionModel | null {
  const session = graph.sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const sessionNumber = new Map(graph.sessions.map((s) => [s.id, s.session_number]));
  const current = session.session_number;
  const upTo = (id: string) => (sessionNumber.get(id) ?? Infinity) <= current;
  const hasEarlier = graph.sessions.some((s) => s.session_number < current);

  const nodes: SessionNode[] = graph.nodes
    .map((n) => {
      const nums = n.occurrences.filter((o) => upTo(o.session_id)).map((o) => sessionNumber.get(o.session_id)!);
      return {
        ...n,
        inSession: n.occurrences.some((o) => o.session_id === sessionId),
        isNew: hasEarlier && nums.length > 0 && Math.min(...nums) === current,
        sessionNumbers: nums,
      };
    })
    .filter((n) => n.sessionNumbers.length > 0);

  const visible = new Set(nodes.map((n) => n.id));
  const edges = graph.edges.filter(
    (e) => visible.has(e.source) && visible.has(e.target) && e.session_ids.some((id) => upTo(id)),
  );
  return { session, nodes, edges, sessionNumber, hasEarlier };
}

export function neighborsOf(id: string, edges: GraphEdge[]) {
  const out = new Set<string>();
  for (const e of edges) {
    if (e.source === id) out.add(e.target);
    if (e.target === id) out.add(e.source);
  }
  return out;
}

/** "Sessions 1, 2" / "Session 3" */
export function sessionsLabel(nums: number[]) {
  const sorted = [...nums].sort((a, b) => a - b);
  return `${sorted.length === 1 ? "Session" : "Sessions"} ${sorted.join(", ")}`;
}
