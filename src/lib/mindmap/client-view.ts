// Pure view model for the client-level map: the most recurring themes across sessions.
import type { ClientGraph, GraphNode } from "../types";

export const RECURRING_LIMIT = 10;

export type RecurringView = {
  /** Nodes shown when the map opens. */
  nodes: GraphNode[];
  /** node id → number of sessions it appeared in */
  sessionCount: Map<string, number>;
  /** True when the client has a single session, so every node is shown. */
  showingAll: boolean;
};

/**
 * The `limit` themes that recur in the most sessions (ties: more connections, then label).
 * A client with one session has nothing recurring yet, so every node is shown.
 */
export function recurringThemes(graph: ClientGraph, limit = RECURRING_LIMIT): RecurringView {
  const sessionCount = new Map(graph.nodes.map((n) => [n.id, n.occurrences.length]));
  if (graph.sessions.length <= 1) return { nodes: graph.nodes, sessionCount, showingAll: true };

  const degree = new Map<string, number>();
  for (const e of graph.edges) for (const id of [e.source, e.target]) degree.set(id, (degree.get(id) ?? 0) + 1);

  const ranked = [...graph.nodes].sort(
    (a, b) =>
      sessionCount.get(b.id)! - sessionCount.get(a.id)! ||
      (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
      a.label.localeCompare(b.label),
  );
  return { nodes: ranked.slice(0, limit), sessionCount, showingAll: false };
}
