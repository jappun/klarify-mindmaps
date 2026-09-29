// Deterministic layouts. Same input → same positions, so views never reshuffle.
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";

export type Point = { x: number; y: number };

/** Small seeded PRNG (mulberry32). */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

type LayoutNode = { id: string; r: number; group: string | null };
type LayoutLink = { source: string; target: string; strength?: number };
type SimNode = SimulationNodeDatum & LayoutNode;

/**
 * Seeded force layout. `group` (e.g. primary narrative id) pulls nodes toward their cluster.
 * Positions are centered on (0,0); the canvas fits the camera to them.
 */
export function forceLayout(
  nodes: LayoutNode[],
  links: LayoutLink[],
  seed: string,
  aspect = 2.2,
  /** Scales the gaps between nodes (link length beyond touching, repulsion, collision padding). */
  spacing = 1,
): Map<string, Point> {
  const rng = seededRandom(hashString(seed));
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const groups = [...new Set(sorted.map((n) => n.group ?? n.id))];
  const anchor = new Map(
    groups.map((g, i) => {
      const a = (i / groups.length) * Math.PI * 2;
      return [g, { x: Math.cos(a) * 260 * aspect, y: Math.sin(a) * 260 }];
    }),
  );

  const sim: SimNode[] = sorted.map((n) => {
    const c = anchor.get(n.group ?? n.id)!;
    return { ...n, x: c.x + (rng() - 0.5) * 120, y: c.y + (rng() - 0.5) * 120 };
  });
  const ids = new Set(sim.map((n) => n.id));
  const simLinks = links.filter((l) => ids.has(l.source) && ids.has(l.target)).map((l) => ({ ...l }));
  const byId = new Map(sim.map((n) => [n.id, n]));

  forceSimulation(sim)
    .randomSource(rng)
    .force(
      "link",
      forceLink<SimNode, LayoutLink & SimulationNodeDatum>(simLinks as never)
        .id((d) => d.id)
        .distance((l) => {
          const s = byId.get(typeof l.source === "string" ? l.source : (l.source as SimNode).id)!;
          const t = byId.get(typeof l.target === "string" ? l.target : (l.target as SimNode).id)!;
          return s.r + t.r + 90 * spacing;
        })
        .strength((l) => l.strength ?? 0.25),
    )
    .force("charge", forceManyBody<SimNode>().strength((d) => -22 * spacing * d.r))
    .force("collide", forceCollide<SimNode>((d) => d.r + 22 * spacing).iterations(3))
    .force("x", forceX<SimNode>(0).strength(0.025))
    .force("y", forceY<SimNode>(0).strength(0.025 * aspect * aspect))
    .stop()
    .tick(400);

  return new Map(sim.map((n) => [n.id, { x: n.x!, y: n.y! }]));
}

/**
 * Center node at (0,0), others evenly spaced (by arc length) on an ellipse shaped like the canvas.
 * The ellipse grows until every node fits without overlapping.
 */
export function ringLayout(centerId: string, ids: string[], centerR: number, r: number, aspect = 2): Map<string, Point> {
  const out = new Map<string, Point>([[centerId, { x: 0, y: 0 }]]);
  if (!ids.length) return out;
  const spacing = 2 * r + 36;
  const perimeter = (a: number, b: number) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  let ry = centerR + r + 70;
  while (perimeter(ry * aspect, ry) < ids.length * spacing) ry += 10;
  const rx = ry * aspect;

  // Sample the ellipse, then walk it placing nodes at equal arc-length steps, starting at the top.
  const samples = 720;
  const pts: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const a = -Math.PI / 2 + (i / samples) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry });
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = cum.at(-1)!;
  let j = 0;
  ids.forEach((id, i) => {
    const target = (i / ids.length) * total;
    while (j < cum.length - 1 && cum[j + 1] < target) j++;
    out.set(id, pts[j]);
  });
  return out;
}

/** Word-wrap a label to fit a circle of radius r at the given font size. */
export function wrapLabel(label: string, r: number, fontSize: number, maxLines = 3): string[] {
  const maxChars = Math.max(6, Math.floor((r * 1.6) / (fontSize * 0.55)));
  const lines: string[] = [];
  let line = "";
  for (const word of label.split(/\s+/)) {
    if (!line) line = word;
    else if ((line + " " + word).length <= maxChars) line += " " + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]}…`;
    return kept;
  }
  return lines;
}
