import type { ClientGraph, GraphNode, Occurrence, Session } from "../types";

export type NodeDetails = {
  node: GraphNode;
  occurrences: (Occurrence & { session: Session })[];
  connections: { node: GraphNode; explanation: string }[];
};

/**
 * Everything the node modal shows. With `maxSessionNumber` (session map), later sessions are
 * invisible: their quotes, and connections to nodes that only appear later.
 */
export function nodeDetails(graph: ClientGraph, nodeId: string, maxSessionNumber = Infinity): NodeDetails | null {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const sessions = new Map(graph.sessions.map((s) => [s.id, s]));
  const inRange = (sid: string) => (sessions.get(sid)?.session_number ?? Infinity) <= maxSessionNumber;
  const visible = (n: GraphNode) => n.occurrences.some((o) => inRange(o.session_id));

  const occurrences = node.occurrences.filter((o) => inRange(o.session_id)).map((o) => ({ ...o, session: sessions.get(o.session_id)! }));

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const connections = graph.edges
    .filter((e) => (e.source === nodeId || e.target === nodeId) && e.session_ids.some(inRange))
    .map((e) => ({ node: byId.get(e.source === nodeId ? e.target : e.source)!, explanation: e.explanation }))
    .filter((c) => c.node && visible(c.node));

  return { node, occurrences, connections };
}
