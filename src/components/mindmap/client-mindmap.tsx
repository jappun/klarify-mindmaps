"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MindmapCanvas, type RenderEdge, type RenderNode } from "./canvas";
import { MindmapInfoButton } from "./info-button";
import { MindmapLegend } from "./legend";
import { useEscape } from "@/lib/client/use-escape";
import { RECURRING_LIMIT, recurringThemes } from "@/lib/mindmap/client-view";
import { NODE_COLORS } from "@/lib/mindmap/colors";
import { forceLayout, ringLayout } from "@/lib/mindmap/layout";
import { neighborsOf, sessionsLabel } from "@/lib/mindmap/session-view";
import { NODE_TYPES, type ClientGraph, type GraphNode, type NodeType } from "@/lib/types";

const R: Record<NodeType, number> = { narrative: 62, belief: 54, strategy: 54, need: 54, value: 54 };
const TYPE_ORDER = new Map(NODE_TYPES.map((t, i) => [t, i]));

/**
 * Client-level map: opens on the most recurring themes across all sessions. Click a node to focus
 * on it and everything it connects to; click again for details.
 */
export function ClientMindmap({ graph, onOpenNode }: { graph: ClientGraph; onOpenNode: (nodeId: string) => void }) {
  const view = useMemo(() => recurringThemes(graph), [graph]);
  const [focusId, setFocusId] = useState<string | null>(null);

  const sessionNumber = useMemo(() => new Map(graph.sessions.map((s) => [s.id, s.session_number])), [graph.sessions]);
  const tooltip = useCallback(
    (n: GraphNode) => sessionsLabel(n.occurrences.map((o) => sessionNumber.get(o.session_id)!)),
    [sessionNumber],
  );

  // Default layout, seeded per client so it never reshuffles.
  const basePositions = useMemo(() => {
    const ids = new Set(view.nodes.map((n) => n.id));
    return forceLayout(
      view.nodes.map((n) => ({ id: n.id, r: R[n.type], group: n.primary_narrative_id && ids.has(n.primary_narrative_id) ? n.primary_narrative_id : n.id })),
      [
        ...graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => ({ source: e.source, target: e.target })),
        ...view.nodes
          .filter((n) => n.primary_narrative_id && ids.has(n.primary_narrative_id))
          .map((n) => ({ source: n.id, target: n.primary_narrative_id!, strength: 0.15 })),
      ],
      `client:${graph.client.id}`,
    );
  }, [view, graph.edges, graph.client.id]);

  // Focus ring around the focused node's resting position.
  const focus = useMemo(() => {
    if (!focusId) return null;
    const center = graph.nodes.find((n) => n.id === focusId)!;
    const ids = neighborsOf(focusId, graph.edges);
    const neighbors = graph.nodes
      .filter((n) => ids.has(n.id))
      .sort((a, b) => TYPE_ORDER.get(a.type)! - TYPE_ORDER.get(b.type)! || a.label.localeCompare(b.label));
    const origin = basePositions.get(focusId) ?? { x: 0, y: 0 };
    const local = ringLayout(focusId, neighbors.map((n) => n.id), R[center.type], 56);
    const pos = new Map([...local].map(([id, p]) => [id, { x: p.x + origin.x, y: p.y + origin.y }]));
    return { center, neighbors, ids, pos };
  }, [focusId, graph.nodes, graph.edges, basePositions]);

  const frame = useMemo((): { nodes: RenderNode[]; edges: RenderEdge[] } => {
    const render = (n: GraphNode, p: { x: number; y: number }): RenderNode => ({
      id: n.id,
      ...p,
      r: R[n.type],
      fill: NODE_COLORS[n.type],
      opacity: 1,
      label: n.label,
      tooltip: tooltip(n),
      clickable: true,
    });

    if (!focus) {
      const ids = new Set(view.nodes.map((n) => n.id));
      return {
        nodes: view.nodes.map((n) => render(n, basePositions.get(n.id)!)),
        edges: graph.edges
          .filter((e) => ids.has(e.source) && ids.has(e.target))
          .map((e) => ({ id: e.id, source: e.source, target: e.target, opacity: 0.9 })),
      };
    }

    return {
      nodes: [focus.center, ...focus.neighbors].map((n) => render(n, focus.pos.get(n.id)!)),
      edges: graph.edges
        .filter((e) => (e.source === focusId && focus.ids.has(e.target)) || (e.target === focusId && focus.ids.has(e.source)))
        .map((e) => ({ id: e.id, source: e.source, target: e.target, opacity: 1, width: 1.8 })),
    };
  }, [view, basePositions, focus, focusId, graph.edges, tooltip]);

  const onNodeClick = useCallback(
    (id: string) => {
      if (focusId) onOpenNode(id);
      else setFocusId(id);
    },
    [focusId, onOpenNode],
  );

  useEscape(() => setFocusId(null));

  return (
    <MindmapCanvas nodes={frame.nodes} edges={frame.edges} fitKey={focusId ?? "recurring"} onNodeClick={onNodeClick}>
      {focusId && (
        <button
          type="button"
          onClick={() => setFocusId(null)}
          aria-label="Back to recurring themes"
          className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border border-klarify-cloud-100 bg-white text-sidebar-selected shadow-lg transition-shadow hover:bg-klarify-gray-mod-50 hover:shadow-xl"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <div className="absolute bottom-4 left-4">
        <MindmapInfoButton
          items={[
            view.showingAll
              ? "This client has one session so far, so every theme is shown. Once there are more sessions, this view shows the themes that recur most."
              : `This view shows the ${RECURRING_LIMIT} themes that came up in the most sessions. Hover a node to see which sessions.`,
            "Click a node to focus on it and everything it connects to, across all sessions.",
            "In focus, click any node again to open its details.",
            "Press Esc or the back arrow to return.",
          ]}
        />
      </div>
      <div className="absolute right-4 bottom-4">
        <MindmapLegend />
      </div>
    </MindmapCanvas>
  );
}
