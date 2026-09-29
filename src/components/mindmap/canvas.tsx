"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { exportMindmapPng, type LegendItem } from "@/lib/client/export-png";
import { wrapLabel } from "@/lib/mindmap/layout";

export type RenderNode = {
  id: string;
  x: number;
  y: number;
  r: number;
  fill: string;
  stroke?: string;
  opacity: number;
  label?: string;
  fontSize?: number;
  /** Fill used while hovered (e.g. gray node → type color). */
  hoverFill?: string;
  tooltip?: string;
  clickable: boolean;
  /** Soft colored ring around the node (e.g. first appearance in this session). */
  halo?: string;
};

export type RenderEdge = { id: string; source: string; target: string; opacity: number; width?: number };

/** Imperative handle for the header's "Download Image". */
export type CanvasApi = {
  exportPng: (opts: { title: string; legend: LegendItem[]; filename: string }) => Promise<void>;
};

type NodeState = { x: number; y: number; r: number; opacity: number };
type Camera = { x: number; y: number; k: number };
/** One animation frame: interpolated node/edge state, camera, and nodes fading out. */
type View = { nodes: Map<string, NodeState>; edges: Map<string, number>; cam: Camera; exiting: RenderNode[] };
const EMPTY_VIEW: View = { nodes: new Map(), edges: new Map(), cam: { x: 0, y: 0, k: 1 }, exiting: [] };

const DURATION = 350;
const FIT_PADDING = 56;
const HALO_WIDTH = 9;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function MindmapCanvas({
  nodes,
  edges,
  fitKey,
  onNodeClick,
  onBackgroundClick,
  apiRef,
  children,
}: {
  nodes: RenderNode[];
  edges: RenderEdge[];
  /** When this changes, the camera animates to fit the visible nodes. */
  fitKey: string;
  onNodeClick?: (id: string) => void;
  onBackgroundClick?: () => void;
  apiRef?: React.RefObject<CanvasApi | null>;
  children?: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [view, setView] = useState<View>(EMPTY_VIEW);
  // Mirror of `view` for effects and event handlers (never read during render).
  const viewRef = useRef<View>(EMPTY_VIEW);
  const commit = useCallback((v: View) => {
    viewRef.current = v;
    setView(v);
  }, []);
  const lastFitKey = useRef<string | null>(null);
  const raf = useRef<number | null>(null);

  // Export exactly what's on the map now (visible nodes), framed to fit regardless of pan/zoom.
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      exportPng: async ({ title, legend, filename }) => {
        const svg = svgRef.current;
        const vis = [...viewRef.current.nodes.values()].filter((n) => n.opacity > 0.25);
        if (!svg || !vis.length) return;
        const pad = HALO_WIDTH * 1.5;
        await exportMindmapPng({
          svg,
          bounds: {
            x0: Math.min(...vis.map((n) => n.x - n.r - pad)),
            x1: Math.max(...vis.map((n) => n.x + n.r + pad)),
            y0: Math.min(...vis.map((n) => n.y - n.r - pad)),
            y1: Math.max(...vis.map((n) => n.y + n.r + pad)),
          },
          title,
          legend,
          filename,
        });
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);

  // Track container size.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitCamera = useCallback(
    (list: RenderNode[]): Camera => {
      if (!size) return viewRef.current.cam;
      const vis = list.filter((n) => n.opacity > 0.25);
      if (!vis.length) return viewRef.current.cam;
      const pad = (n: RenderNode) => n.r + (n.halo ? HALO_WIDTH : 0);
      const x0 = Math.min(...vis.map((n) => n.x - pad(n)));
      const x1 = Math.max(...vis.map((n) => n.x + pad(n)));
      const y0 = Math.min(...vis.map((n) => n.y - pad(n)));
      const y1 = Math.max(...vis.map((n) => n.y + pad(n)));
      const k = Math.min(
        (size.w - FIT_PADDING * 2) / Math.max(x1 - x0, 1),
        (size.h - FIT_PADDING * 2) / Math.max(y1 - y0, 1),
        1.15,
      );
      return { k, x: size.w / 2 - ((x0 + x1) / 2) * k, y: size.h / 2 - ((y0 + y1) / 2) * k };
    },
    [size],
  );

  // Animate from the current state to the new target whenever inputs change.
  useLayoutEffect(() => {
    if (!size) return;
    const prev = viewRef.current;
    const targetIds = new Set(nodes.map((n) => n.id));
    const first = prev.nodes.size === 0;

    // Nodes that disappeared fade out in place.
    const exiting = new Map(prev.exiting.filter((n) => !targetIds.has(n.id)).map((n) => [n.id, n]));
    for (const [id, st] of prev.nodes) {
      if (!targetIds.has(id) && !exiting.has(id)) {
        exiting.set(id, { id, x: st.x, y: st.y, r: st.r, fill: "#ffffff", opacity: 0, clickable: false });
      }
    }

    const from = new Map<string, NodeState>();
    const to = new Map<string, NodeState>();
    for (const n of nodes) {
      to.set(n.id, { x: n.x, y: n.y, r: n.r, opacity: n.opacity });
      from.set(n.id, prev.nodes.get(n.id) ?? { x: n.x, y: n.y, r: n.r, opacity: 0 });
    }
    for (const [id, n] of exiting) {
      const st = prev.nodes.get(id) ?? { x: n.x, y: n.y, r: n.r, opacity: 0 };
      from.set(id, st);
      to.set(id, { ...st, opacity: 0 });
    }
    const edgeFrom = new Map(edges.map((e) => [e.id, prev.edges.get(e.id) ?? 0]));

    const camFrom = prev.cam;
    const refit = lastFitKey.current !== fitKey;
    lastFitKey.current = fitKey;
    const camTo = refit ? fitCamera(nodes) : camFrom;
    const exitingList = [...exiting.values()];

    const frameAt = (t: number, done: boolean): View => {
      const next = new Map<string, NodeState>();
      for (const [id, a] of from) {
        if (done && exiting.has(id)) continue;
        const b = to.get(id)!;
        next.set(id, { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), r: lerp(a.r, b.r, t), opacity: lerp(a.opacity, b.opacity, t) });
      }
      return {
        nodes: next,
        edges: new Map(edges.map((e) => [e.id, lerp(edgeFrom.get(e.id)!, e.opacity, t)])),
        cam: { x: lerp(camFrom.x, camTo.x, t), y: lerp(camFrom.y, camTo.y, t), k: lerp(camFrom.k, camTo.k, t) },
        exiting: done ? [] : exitingList,
      };
    };

    if (raf.current) cancelAnimationFrame(raf.current);
    if (first) {
      commit(frameAt(1, true));
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      commit(frameAt(ease(t), t === 1));
      raf.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [nodes, edges, fitKey, size, fitCamera, commit]);

  // ---- pan & zoom ----
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest("[data-node]")) return;
    const { cam } = viewRef.current;
    drag.current = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    const v = viewRef.current;
    commit({ ...v, cam: { ...v.cam, x: d.cx + dx, y: d.cy + dy } });
  };
  const onPointerUp = () => {
    if (drag.current && !drag.current.moved) onBackgroundClick?.();
    drag.current = null;
  };
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const v = viewRef.current;
      const c = v.cam;
      const k = Math.min(3, Math.max(0.2, c.k * Math.exp(-e.deltaY * 0.0015)));
      commit({ ...v, cam: { k, x: px - ((px - c.x) / c.k) * k, y: py - ((py - c.y) / c.k) * k } });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [commit]);

  // ---- render ----
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const all = [...nodes, ...view.exiting];
  const c = view.cam;
  const hoveredNode = hovered ? byId.get(hovered) : undefined;
  const hoveredState = hovered ? view.nodes.get(hovered) : undefined;

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none select-none overflow-hidden"
      style={{ backgroundImage: "radial-gradient(#d4d4d4 1px, transparent 1px)", backgroundSize: "18px 18px" }}
    >
      {size && (
        <svg
          ref={svgRef}
          width={size.w}
          height={size.h}
          className="block cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <defs>
            <filter id="node-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.12" />
            </filter>
            <filter id="node-halo" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <g data-camera transform={`translate(${c.x},${c.y}) scale(${c.k})`}>
            <g>
              {edges.map((e) => {
                const a = view.nodes.get(e.source);
                const b = view.nodes.get(e.target);
                const op = (view.edges.get(e.id) ?? 0) * Math.min(a?.opacity ?? 0, b?.opacity ?? 0);
                if (!a || !b || op < 0.01) return null;
                return (
                  <line
                    key={e.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#b8b8b8"
                    strokeWidth={(e.width ?? 1.4) / Math.max(c.k, 0.5)}
                    opacity={op}
                  />
                );
              })}
            </g>
            {all.map((n) => {
              const st = view.nodes.get(n.id);
              if (!st || st.opacity < 0.01) return null;
              const isHover = hovered === n.id;
              const fontSize = n.fontSize ?? 12.5;
              const lines = n.label ? wrapLabel(n.label, st.r, fontSize) : [];
              const interactive = st.opacity > 0.3 && (n.clickable || !!n.tooltip);
              return (
                <g
                  key={n.id}
                  data-node
                  transform={`translate(${st.x},${st.y})`}
                  opacity={st.opacity}
                  style={{ cursor: n.clickable && interactive ? "pointer" : "default", pointerEvents: interactive ? "auto" : "none" }}
                  onPointerEnter={() => setHovered(n.id)}
                  onPointerLeave={() => setHovered((h) => (h === n.id ? null : h))}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (n.clickable) onNodeClick?.(n.id);
                  }}
                >
                  {n.halo && (
                    <>
                      <circle r={st.r + HALO_WIDTH / 2} fill="none" stroke={n.halo} strokeWidth={HALO_WIDTH * 1.6} opacity={0.55} filter="url(#node-halo)" />
                      <circle r={st.r + HALO_WIDTH / 2} fill="none" stroke={n.halo} strokeWidth={HALO_WIDTH} />
                    </>
                  )}
                  <circle
                    r={st.r}
                    fill={isHover && n.hoverFill ? n.hoverFill : n.fill}
                    stroke={n.stroke ?? "#ffffff"}
                    strokeWidth={3}
                    filter="url(#node-shadow)"
                    style={{ transition: "fill 180ms ease" }}
                  />
                  {lines.length > 0 && (
                    <text
                      textAnchor="middle"
                      fontSize={fontSize}
                      fontWeight={500}
                      fill="#1e2938"
                      style={{ pointerEvents: "none" }}
                    >
                      {lines.map((line, i) => (
                        <tspan key={i} x={0} y={(i - (lines.length - 1) / 2) * fontSize * 1.2 + fontSize * 0.35}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {hoveredNode?.tooltip && hoveredState && (
        <div
          className="fade-in-0 zoom-in-95 pointer-events-none absolute z-50 animate-in whitespace-nowrap rounded-md bg-klarify-neutral-800 px-3 py-1.5 text-sm text-white"
          style={{
            left: hoveredState.x * c.k + c.x,
            top: (hoveredState.y - hoveredState.r) * c.k + c.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          {hoveredNode.tooltip}
        </div>
      )}

      {children}
    </div>
  );
}
