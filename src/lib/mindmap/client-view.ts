// Pure view model for the client-level, narratives-first map (SPEC §5).
import type { ClientGraph, GraphEdge, GraphNode } from "../types";

export type ClientModel = {
  narratives: GraphNode[];
  /** narrative id → nodes whose primary narrative it is */
  clusters: Map<string, GraphNode[]>;
  /**
   * narrative id → everything shown when it's expanded: its cluster first, then nodes from other
   * clusters that connect to it (so cross-cluster edges are drawn when either cluster is open).
   * The count badge is this list's length.
   */
  members: Map<string, GraphNode[]>;
  /** Narrative–narrative links: they share an attached node, or are directly connected. */
  narrativeLinks: { id: string; source: string; target: string; weight: number }[];
  /** node id → narrative ids it's attached to (primary or via an edge) */
  attachedTo: Map<string, Set<string>>;
  edges: GraphEdge[];
};

export function buildClientModel(graph: ClientGraph): ClientModel {
  const narratives = graph.nodes.filter((n) => n.type === "narrative");
  const narrativeIds = new Set(narratives.map((n) => n.id));
  const others = graph.nodes.filter((n) => n.type !== "narrative");

  const attachedTo = new Map<string, Set<string>>(others.map((n) => [n.id, new Set<string>()]));
  for (const n of others) if (n.primary_narrative_id && narrativeIds.has(n.primary_narrative_id)) attachedTo.get(n.id)!.add(n.primary_narrative_id);
  for (const e of graph.edges) {
    if (narrativeIds.has(e.source) && attachedTo.has(e.target)) attachedTo.get(e.target)!.add(e.source);
    if (narrativeIds.has(e.target) && attachedTo.has(e.source)) attachedTo.get(e.source)!.add(e.target);
  }

  // A node with no usable primary joins the first narrative it connects to, so nothing is orphaned.
  const clusters = new Map<string, GraphNode[]>(narratives.map((n) => [n.id, []]));
  for (const n of others) {
    const primary =
      n.primary_narrative_id && narrativeIds.has(n.primary_narrative_id) ? n.primary_narrative_id : [...attachedTo.get(n.id)!][0];
    if (primary) clusters.get(primary)!.push(n);
  }

  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const weights = new Map<string, number>();
  for (const set of attachedTo.values()) {
    const list = [...set];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) weights.set(pairKey(list[i], list[j]), (weights.get(pairKey(list[i], list[j])) ?? 0) + 1);
  }
  for (const e of graph.edges) {
    if (narrativeIds.has(e.source) && narrativeIds.has(e.target)) {
      const k = pairKey(e.source, e.target);
      weights.set(k, (weights.get(k) ?? 0) + 1);
    }
  }
  const narrativeLinks = [...weights].map(([k, weight]) => {
    const [source, target] = k.split("|");
    return { id: `nl:${k}`, source, target, weight };
  });

  const members = new Map<string, GraphNode[]>(
    narratives.map((nar) => {
      const primary = clusters.get(nar.id)!;
      const ids = new Set(primary.map((m) => m.id));
      const secondary = others.filter((o) => !ids.has(o.id) && attachedTo.get(o.id)!.has(nar.id));
      return [nar.id, [...primary, ...secondary]];
    }),
  );

  return { narratives, clusters, members, narrativeLinks, attachedTo, edges: graph.edges };
}
