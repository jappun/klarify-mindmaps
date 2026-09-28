"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MindmapCanvas, type RenderEdge, type RenderNode } from "./canvas";
import { MindmapInfoButton } from "./info-button";
import { MindmapLegend } from "./legend";
import { useEscape } from "@/lib/client/use-escape";
import { buildClientModel } from "@/lib/mindmap/client-view";
import { NODE_COLORS } from "@/lib/mindmap/colors";
import { forceLayout, ringLayout } from "@/lib/mindmap/layout";
import { NODE_TYPES, type ClientGraph } from "@/lib/types";

const R_NARRATIVE = 70;
const R_NODE = 54;
const TYPE_ORDER = new Map(NODE_TYPES.map((t, i) => [t, i]));

export function ClientMindmap({ graph, onOpenNode }: { graph: ClientGraph; onOpenNode: (nodeId: string) => void }) {
  const model = useMemo(() => buildClientModel(graph), [graph]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const basePositions = useMemo(
    () =>
      forceLayout(
        model.narratives.map((n) => ({ id: n.id, r: R_NARRATIVE + 30, group: n.id })),
        model.narrativeLinks.map((l) => ({ source: l.source, target: l.target, strength: 0.3 })),
        `client:${graph.client.id}`,
        1.8,
      ),
    [model, graph.client.id],
  );

  // Expanded layout: cluster on a ring around the narrative; other narratives pushed just outside it.
  const expandedLayout = useMemo(() => {
    if (!expanded) return null;
    const origin = basePositions.get(expanded)!;
    const members = [...(model.members.get(expanded) ?? [])].sort(
      (a, b) => TYPE_ORDER.get(a.type)! - TYPE_ORDER.get(b.type)! || a.label.localeCompare(b.label),
    );
    const ring = ringLayout(expanded, members.map((m) => m.id), R_NARRATIVE, R_NODE);
    const pos = new Map([...ring].map(([id, p]) => [id, { x: p.x + origin.x, y: p.y + origin.y }]));
    const ringRx = Math.max(...[...ring.values()].map((p) => Math.abs(p.x)), R_NARRATIVE) + R_NODE + 110;
    const ringRy = Math.max(...[...ring.values()].map((p) => Math.abs(p.y)), R_NARRATIVE) + R_NODE + 110;
    for (const n of model.narratives) {
      if (n.id === expanded) continue;
      const p = basePositions.get(n.id)!;
      const a = Math.atan2(p.y - origin.y, p.x - origin.x);
      pos.set(n.id, { x: origin.x + Math.cos(a) * ringRx, y: origin.y + Math.sin(a) * ringRy });
    }
    return { pos, members };
  }, [expanded, basePositions, model]);

  const frame = useMemo((): { nodes: RenderNode[]; edges: RenderEdge[] } => {
    const count = (id: string) => model.members.get(id)?.length ?? 0;
    const narrativeNode = (id: string, label: string, p: { x: number; y: number }, opacity: number): RenderNode => ({
      id,
      ...p,
      r: R_NARRATIVE,
      fill: NODE_COLORS.narrative,
      opacity,
      label,
      fontSize: 14,
      clickable: true,
      count: count(id),
    });

    if (!expandedLayout || !expanded) {
      return {
        nodes: model.narratives.map((n) => narrativeNode(n.id, n.label, basePositions.get(n.id)!, 1)),
        edges: model.narrativeLinks.map((l) => ({ ...l, opacity: 0.8, width: 1.2 + Math.min(l.weight, 4) * 0.6 })),
      };
    }

    const { pos, members } = expandedLayout;
    const memberIds = new Set(members.map((m) => m.id));
    const narrativeIds = new Set(model.narratives.map((n) => n.id));
    const nodes: RenderNode[] = [
      ...model.narratives.map((n) => narrativeNode(n.id, n.label, pos.get(n.id)!, n.id === expanded ? 1 : 0.18)),
      ...members.map((m) => ({
        id: m.id,
        ...pos.get(m.id)!,
        r: R_NODE,
        fill: NODE_COLORS[m.type],
        opacity: 1,
        label: m.label,
        clickable: true,
      })),
    ];

    const edges: RenderEdge[] = [];
    const linked = new Set<string>();
    for (const e of model.edges) {
      const touchesCluster = memberIds.has(e.source) || memberIds.has(e.target) || e.source === expanded || e.target === expanded;
      const inView = (id: string) => memberIds.has(id) || narrativeIds.has(id);
      if (!touchesCluster || !inView(e.source) || !inView(e.target)) continue;
      const toCenter = e.source === expanded || e.target === expanded;
      // Edges from this cluster to other narratives stay visible (faint) so cross-links show.
      const toOtherNarrative = (narrativeIds.has(e.source) && e.source !== expanded) || (narrativeIds.has(e.target) && e.target !== expanded);
      edges.push({ id: e.id, source: e.source, target: e.target, opacity: toCenter ? 1 : toOtherNarrative ? 0.35 : 0.5 });
      if (toCenter) linked.add(e.source === expanded ? e.target : e.source);
    }
    // Members attached only by primary narrative still get a spoke to the center.
    for (const m of members) {
      if (!linked.has(m.id)) edges.push({ id: `spoke:${m.id}`, source: expanded, target: m.id, opacity: 0.7 });
    }
    return { nodes, edges };
  }, [model, basePositions, expanded, expandedLayout]);

  const onNodeClick = useCallback(
    (id: string) => {
      if (!expanded) return setExpanded(id);
      const isOtherNarrative = id !== expanded && model.narratives.some((n) => n.id === id);
      if (isOtherNarrative) setExpanded(id);
      else onOpenNode(id);
    },
    [expanded, model, onOpenNode],
  );

  useEscape(() => setExpanded(null));

  return (
    <MindmapCanvas nodes={frame.nodes} edges={frame.edges} fitKey={expanded ?? "narratives"} onNodeClick={onNodeClick}>
      {expanded && (
        <button
          type="button"
          onClick={() => setExpanded(null)}
          aria-label="Back to narratives"
          className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border border-klarify-cloud-100 bg-white text-sidebar-selected shadow-lg transition-shadow hover:bg-klarify-gray-mod-50 hover:shadow-xl"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <div className="absolute bottom-4 left-4">
        <MindmapInfoButton
          items={[
            "This view starts with the client's narratives — the overarching stories — across every session. The number on each shows how many themes belong to it.",
            "Click a narrative to open its cluster of beliefs, strategies, needs and values.",
            "Click any node in the open cluster to see its details, quotes and reflection questions.",
            "Press Esc or the back arrow to return to the narratives.",
          ]}
        />
      </div>
      <div className="absolute right-4 bottom-4">
        <MindmapLegend />
      </div>
    </MindmapCanvas>
  );
}
