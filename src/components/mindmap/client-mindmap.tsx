"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { slug, type LegendItem } from "@/lib/client/export-png";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { MindmapCanvas, type CanvasApi, type RenderEdge, type RenderNode } from "./canvas";
import { MindmapInfoButton } from "./info-button";
import { MindmapLegend } from "./legend";
import { useEscape } from "@/lib/client/use-escape";
import { RECURRING_LIMIT, recurringThemes } from "@/lib/mindmap/client-view";
import { NODE_COLORS, TYPE_LABEL_PLURAL } from "@/lib/mindmap/colors";
import { forceLayout, ringLayout } from "@/lib/mindmap/layout";
import { neighborsOf, sessionsLabel } from "@/lib/mindmap/session-view";
import { NODE_TYPES, type ClientGraph, type GraphNode, type NodeType } from "@/lib/types";

const R: Record<NodeType, number> = { narrative: 62, belief: 54, strategy: 54, need: 54, value: 54 };
const TYPE_ORDER = new Map(NODE_TYPES.map((t, i) => [t, i]));

type Mode = "recurring" | "full";

/**
 * Client-level map: opens on the most recurring themes across all sessions, with a toggle to the full
 * map. Click a node to focus on it and everything it connects to; click again for details.
 */
export function ClientMindmap({
  graph,
  onOpenNode,
  downloadRef,
}: {
  graph: ClientGraph;
  onOpenNode: (nodeId: string) => void;
  /** Filled with a function that downloads the current view as a PNG. */
  downloadRef?: React.RefObject<(() => Promise<void>) | null>;
}) {
  const recurring = useMemo(() => recurringThemes(graph), [graph]);
  const [mode, setMode] = useState<Mode>("recurring");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<NodeType>>(new Set());
  const toggleType = (type: NodeType) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  // One-session clients already see everything, so the toggle has nothing to switch.
  const canToggle = !recurring.showingAll;
  const view = useMemo(
    () => (mode === "full" || !canToggle ? { ...recurring, nodes: graph.nodes } : recurring),
    [mode, canToggle, recurring, graph.nodes],
  );
  const switchMode = (m: Mode) => {
    setFocusId(null);
    setMode(m);
  };

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
      `client:${graph.client.id}:${mode}`,
    );
  }, [view, graph.edges, graph.client.id, mode]);

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

    // Type filter hides nodes without moving the rest (the focused node always stays).
    const shown = (n: GraphNode) => !hidden.has(n.type) || n.id === focusId;

    if (!focus) {
      const visible = view.nodes.filter(shown);
      const ids = new Set(visible.map((n) => n.id));
      return {
        nodes: visible.map((n) => render(n, basePositions.get(n.id)!)),
        edges: graph.edges
          .filter((e) => ids.has(e.source) && ids.has(e.target))
          .map((e) => ({ id: e.id, source: e.source, target: e.target, opacity: 0.9 })),
      };
    }

    const visible = [focus.center, ...focus.neighbors].filter(shown);
    const ids = new Set(visible.map((n) => n.id));
    return {
      nodes: visible.map((n) => render(n, focus.pos.get(n.id)!)),
      edges: graph.edges
        .filter((e) => (e.source === focusId && ids.has(e.target)) || (e.target === focusId && ids.has(e.source)))
        .map((e) => ({ id: e.id, source: e.source, target: e.target, opacity: 1, width: 1.8 })),
    };
  }, [view, basePositions, focus, focusId, graph.edges, tooltip, hidden]);

  const onNodeClick = useCallback(
    (id: string) => {
      if (focusId) onOpenNode(id);
      else setFocusId(id);
    },
    [focusId, onOpenNode],
  );

  useEscape(() => setFocusId(null));

  const canvasApi = useRef<CanvasApi | null>(null);
  useEffect(() => {
    if (!downloadRef) return;
    downloadRef.current = async () => {
      const shown = new Set(frame.nodes.map((n) => n.id));
      const focused = focusId ? graph.nodes.find((n) => n.id === focusId) : null;
      const legend: LegendItem[] = NODE_TYPES.filter((t) => graph.nodes.some((n) => n.type === t && shown.has(n.id))).map((t) => ({
        label: TYPE_LABEL_PLURAL[t],
        color: NODE_COLORS[t],
      }));
      const which = focused ? focused.label : mode === "full" || !canToggle ? "Full map" : "Most recurring themes";
      await canvasApi.current?.exportPng({
        title: `${graph.client.name} — ${which}`,
        legend,
        filename: `${slug(graph.client.name)}-${slug(which)}-mindmap.png`,
      });
    };
    return () => {
      downloadRef.current = null;
    };
  }, [downloadRef, frame, focusId, graph, mode, canToggle]);

  return (
    <MindmapCanvas
      nodes={frame.nodes}
      edges={frame.edges}
      fitKey={`${mode}|${focusId ?? "all"}|${[...hidden].sort().join(",")}`}
      onNodeClick={onNodeClick}
      apiRef={canvasApi}
    >
      {canToggle && (
        // Segmented control in the style of Klarify's client-page tabs.
        <div className="absolute top-4 right-4 inline-flex h-10 items-center gap-1 rounded-lg bg-klarify-neutral-100 p-1 text-sm shadow-sm">
          {(
            [
              ["recurring", "Most recurring"],
              ["full", "Full map"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => switchMode(m)}
              className={cn(
                "h-full rounded-md px-3 transition-colors",
                mode === m ? "bg-white text-klarify-neutral-800 shadow-sm" : "text-klarify-neutral-600 hover:text-klarify-neutral-800",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
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
            !canToggle
              ? "This client has one session so far, so every theme is shown. Once there are more sessions, the map opens on the themes that recur most."
              : `"Most recurring" shows the ${RECURRING_LIMIT} themes that came up in the most sessions; "Full map" shows every theme. Hover a node to see which sessions.`,
            "Click a node to focus on it and everything it connects to, across all sessions.",
            "In focus, click any node again to open its details.",
            "Press Esc or the back arrow to return.",
            "Untick a type in the legend to hide it from the map.",
          ]}
        />
      </div>
      <div className="absolute right-4 bottom-4">
        <MindmapLegend hidden={hidden} onToggle={toggleType} />
      </div>
    </MindmapCanvas>
  );
}
