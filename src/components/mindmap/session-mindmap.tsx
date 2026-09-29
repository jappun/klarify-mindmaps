"use client";

import { useCallback, useMemo, useState } from "react";
import { useEscape } from "@/lib/client/use-escape";
import { ArrowLeft } from "lucide-react";
import { MindmapCanvas, type RenderEdge, type RenderNode } from "./canvas";
import { MindmapInfoButton } from "./info-button";
import { MindmapLegend } from "./legend";
import { NEW_NODE_HALO, NODE_COLORS, OTHER_SESSION_FILL, OTHER_SESSION_STROKE } from "@/lib/mindmap/colors";
import { forceLayout, ringLayout } from "@/lib/mindmap/layout";
import { buildSessionModel, neighborsOf, sessionsLabel } from "@/lib/mindmap/session-view";
import { NODE_TYPES, type ClientGraph, type NodeType } from "@/lib/types";

const R_FULL: Record<NodeType, number> = { narrative: 62, belief: 54, strategy: 54, need: 54, value: 54 };
const SMALL = 0.6;
const TYPE_ORDER = new Map(NODE_TYPES.map((t, i) => [t, i]));

export function SessionMindmap({
  graph,
  sessionId,
  onOpenNode,
}: {
  graph: ClientGraph;
  sessionId: string;
  onOpenNode: (nodeId: string) => void;
}) {
  const model = useMemo(() => buildSessionModel(graph, sessionId), [graph, sessionId]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<NodeType>>(new Set());

  // Default layout, computed once per session view (seeded → stable).
  const basePositions = useMemo(() => {
    if (!model) return new Map();
    const layoutNodes = model.nodes.map((n) => ({
      id: n.id,
      r: R_FULL[n.type] * (n.inSession ? 1 : SMALL),
      group: n.type === "narrative" ? n.id : n.primary_narrative_id,
    }));
    const links = [
      ...model.edges.map((e) => ({ source: e.source, target: e.target })),
      ...model.nodes
        .filter((n) => n.primary_narrative_id)
        .map((n) => ({ source: n.id, target: n.primary_narrative_id!, strength: 0.15 })),
    ];
    return forceLayout(layoutNodes, links, `session:${sessionId}`);
  }, [model, sessionId]);

  // Focus ring for the focused node: deterministic, and computed from all neighbors (ignoring the
  // type filter) so toggling types in focus never moves the remaining nodes.
  const focusRing = useMemo(() => {
    if (!model || !focusId) return null;
    const center = model.nodes.find((n) => n.id === focusId)!;
    const ids = neighborsOf(focusId, model.edges);
    const ordered = model.nodes
      .filter((n) => ids.has(n.id))
      .sort((a, b) => TYPE_ORDER.get(a.type)! - TYPE_ORDER.get(b.type)! || a.label.localeCompare(b.label));
    const origin = basePositions.get(focusId)!;
    const local = ringLayout(focusId, ordered.map((n) => n.id), R_FULL[center.type], 56);
    return new Map([...local].map(([id, p]) => [id, { x: p.x + origin.x, y: p.y + origin.y }]));
  }, [model, focusId, basePositions]);

  const frame = useMemo((): { nodes: RenderNode[]; edges: RenderEdge[] } => {
    if (!model) return { nodes: [], edges: [] };
    const visible = model.nodes.filter((n) => !hidden.has(n.type) || n.id === focusId);

    if (!focusId) {
      const ids = new Set(visible.map((n) => n.id));
      const inSession = new Set(visible.filter((n) => n.inSession).map((n) => n.id));
      return {
        nodes: visible.map((n) => {
          const p = basePositions.get(n.id)!;
          const color = NODE_COLORS[n.type];
          return n.inSession
            ? {
                id: n.id,
                ...p,
                r: R_FULL[n.type],
                fill: color,
                opacity: 1,
                label: n.label,
                clickable: true,
                halo: n.isNew ? NEW_NODE_HALO : undefined,
              }
            : {
                id: n.id,
                ...p,
                r: R_FULL[n.type] * SMALL,
                fill: OTHER_SESSION_FILL,
                stroke: OTHER_SESSION_STROKE,
                hoverFill: color,
                tooltip: `${n.label} · ${sessionsLabel(n.sessionNumbers)}`,
                opacity: 1,
                clickable: false,
              };
        }),
        edges: model.edges
          .filter((e) => ids.has(e.source) && ids.has(e.target))
          .map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            opacity: inSession.has(e.source) && inSession.has(e.target) ? 0.9 : 0.4,
          })),
      };
    }

    // Focus view: the clicked node plus every directly connected node, from any session, in full color.
    const center = model.nodes.find((n) => n.id === focusId)!;
    const neighborIds = neighborsOf(focusId, model.edges);
    const neighbors = visible.filter((n) => neighborIds.has(n.id));
    const ring = focusRing!;

    const shown = [center, ...neighbors];
    return {
      nodes: shown.map((n) => ({
        id: n.id,
        ...(ring.get(n.id) ?? basePositions.get(n.id)!),
        r: R_FULL[n.type],
        fill: NODE_COLORS[n.type],
        opacity: 1,
        label: n.label,
        clickable: true,
      })),
      edges: model.edges
        .filter((e) => (e.source === focusId && neighborIds.has(e.target)) || (e.target === focusId && neighborIds.has(e.source)))
        .filter((e) => shown.some((n) => n.id === e.source) && shown.some((n) => n.id === e.target))
        .map((e) => ({ id: e.id, source: e.source, target: e.target, opacity: 1, width: 1.8 })),
    };
  }, [model, basePositions, focusId, focusRing, hidden]);

  const onNodeClick = useCallback(
    (id: string) => {
      if (focusId) onOpenNode(id);
      else setFocusId(id);
    },
    [focusId, onOpenNode],
  );

  useEscape(() => setFocusId(null));

  const toggleType = (type: NodeType) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  if (!model) return null;

  return (
    <MindmapCanvas
      nodes={frame.nodes}
      edges={frame.edges}
      fitKey={`${focusId ?? "default"}|${[...hidden].sort().join(",")}`}
      onNodeClick={onNodeClick}
    >
      {focusId && (
        <button
          type="button"
          onClick={() => setFocusId(null)}
          aria-label="Back to full map"
          className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border border-klarify-cloud-100 bg-white text-sidebar-selected shadow-lg transition-shadow hover:bg-klarify-gray-mod-50 hover:shadow-xl"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <div className="absolute bottom-4 left-4">
        <MindmapInfoButton
          items={[
            <>
              <b className="font-medium text-klarify-gray-mod-800">Colored nodes</b> came up in this session.{" "}
              <b className="font-medium text-klarify-gray-mod-800">Small gray nodes</b> are from earlier sessions — hover
              to see what they are.
            </>,
            "A yellow halo marks themes that came up for the first time in this session.",
            "Click a colored node to focus on it and everything it connects to, across all sessions.",
            "In focus, click any node again to open its details.",
            "Press Esc or the back arrow to return to the full map.",
            "Untick a type in the legend to hide it from the map.",
          ]}
        />
      </div>
      <div className="absolute right-4 bottom-4">
        <MindmapLegend hidden={hidden} onToggle={toggleType} showOtherSessions />
      </div>
    </MindmapCanvas>
  );
}
