import { describe, expect, it } from "vitest";
import type { ClientGraph, GraphNode, Session } from "../types";
import { forceLayout, ringLayout } from "./layout";
import { buildSessionModel, sessionsLabel } from "./session-view";

const session = (n: number): Session => ({
  id: `S${n}`,
  client_id: "C",
  session_number: n,
  session_date: `2026-09-${10 + n}`,
  status: "ready",
  failed_step: null,
  created_at: "",
});
const node = (id: string, sessions: number[]): GraphNode => ({
  id,
  type: "belief",
  label: id,
  description: "",
  need_category: null,
  primary_narrative_id: null,
  first_session_id: `S${sessions[0]}`,
  occurrences: sessions.map((n) => ({ session_id: `S${n}`, summary: [], quotes: [] })),
});

const graph: ClientGraph = {
  client: { id: "C", name: "Nora", created_at: "" },
  sessions: [session(1), session(2), session(3)],
  nodes: [node("a", [1, 3]), node("b", [2]), node("c", [3]), node("d", [1])],
  edges: [
    { id: "ab", source: "a", target: "b", explanation: "", session_ids: ["S2"] },
    { id: "ac", source: "a", target: "c", explanation: "", session_ids: ["S3"] },
    { id: "ad", source: "a", target: "d", explanation: "", session_ids: ["S1", "S3"] },
  ],
  questions: [],
};

describe("buildSessionModel", () => {
  it("session 2 hides nodes and edges that first appear later", () => {
    const m = buildSessionModel(graph, "S2")!;
    expect(m.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "d"]);
    expect(m.edges.map((e) => e.id).sort()).toEqual(["ab", "ad"]);
    const byId = new Map(m.nodes.map((n) => [n.id, n]));
    expect(byId.get("b")).toMatchObject({ inSession: true, isNew: true, sessionNumbers: [2] });
    expect(byId.get("a")).toMatchObject({ inSession: false, isNew: false, sessionNumbers: [1] });
  });

  it("session 3 sees everything; recurring nodes aren't new", () => {
    const m = buildSessionModel(graph, "S3")!;
    expect(m.nodes).toHaveLength(4);
    const a = m.nodes.find((n) => n.id === "a")!;
    expect(a).toMatchObject({ inSession: true, isNew: false, sessionNumbers: [1, 3] });
    expect(m.nodes.find((n) => n.id === "c")!.isNew).toBe(true);
  });

  it("formats session labels", () => {
    expect(sessionsLabel([2, 1])).toBe("Sessions 1, 2");
    expect(sessionsLabel([3])).toBe("Session 3");
  });
});

describe("layouts are deterministic and non-overlapping", () => {
  const nodes = Array.from({ length: 20 }, (_, i) => ({ id: `n${i}`, r: 54, group: `g${i % 4}` }));
  const links = nodes.slice(1).map((n, i) => ({ source: n.id, target: nodes[i].id }));

  it("forceLayout gives identical output for the same seed", () => {
    expect([...forceLayout(nodes, links, "x")]).toEqual([...forceLayout(nodes, links, "x")]);
  });

  it("ringLayout never overlaps neighbors", () => {
    const pos = [...ringLayout("c", nodes.map((n) => n.id), 62, 54).entries()].filter(([id]) => id !== "c");
    for (let i = 0; i < pos.length; i++)
      for (let j = i + 1; j < pos.length; j++) {
        const [, a] = pos[i];
        const [, b] = pos[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(108);
      }
  });
});

describe("nodeDetails", () => {
  it("hides later sessions' quotes and connections when capped at a session", async () => {
    const { nodeDetails } = await import("./node-details");
    const capped = nodeDetails(graph, "a", 2)!;
    expect(capped.occurrences.map((o) => o.session_id)).toEqual(["S1"]);
    expect(capped.connections.map((c) => c.node.id).sort()).toEqual(["b", "d"]);
    const all = nodeDetails(graph, "a")!;
    expect(all.occurrences.map((o) => o.session_id)).toEqual(["S1", "S3"]);
    expect(all.connections.map((c) => c.node.id).sort()).toEqual(["b", "c", "d"]);
  });
});
