import { describe, expect, it } from "vitest";
import type { ClientGraph, GraphNode, NodeType, Session } from "../types";
import { recurringThemes } from "./client-view";

const session = (n: number): Session => ({
  id: `S${n}`,
  client_id: "C",
  session_number: n,
  session_date: "2026-09-14",
  status: "ready",
  failed_step: null,
  created_at: "",
});
const node = (id: string, sessions: number[], type: NodeType = "belief"): GraphNode => ({
  id,
  type,
  label: id,
  description: "",
  need_category: null,
  primary_narrative_id: null,
  first_session_id: `S${sessions[0]}`,
  occurrences: sessions.map((n) => ({ session_id: `S${n}`, summary: [], quotes: [] })),
});
const edge = (source: string, target: string) => ({ id: `${source}-${target}`, source, target, explanation: "", session_ids: ["S1"] });

const graph = (nodes: GraphNode[], sessions = 3): ClientGraph => ({
  client: { id: "C", name: "Nora", created_at: "" },
  sessions: Array.from({ length: sessions }, (_, i) => session(i + 1)),
  nodes,
  edges: [edge("b", "x"), edge("b", "y"), edge("c", "x")],
  questions: [],
});

describe("recurringThemes", () => {
  it("ranks by session count, then connections, then label, and caps the list", () => {
    const g = graph([node("a", [1]), node("b", [1, 2]), node("c", [1, 3]), node("d", [1, 2, 3]), node("x", [1]), node("y", [2])]);
    const view = recurringThemes(g, 3);
    expect(view.nodes.map((n) => n.id)).toEqual(["d", "b", "c"]);
    expect(view.showingAll).toBe(false);
    expect(view.sessionCount.get("d")).toBe(3);
  });

  it("shows every node for a client with one session", () => {
    const g = graph([node("a", [1]), node("b", [1]), node("c", [1])], 1);
    const view = recurringThemes(g, 2);
    expect(view.nodes).toHaveLength(3);
    expect(view.showingAll).toBe(true);
  });
});
