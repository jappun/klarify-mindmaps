import { describe, expect, it } from "vitest";
import type { ClientGraph, GraphNode, NodeType } from "../types";
import { buildClientModel } from "./client-view";

const n = (id: string, type: NodeType, primary: string | null = null): GraphNode => ({
  id,
  type,
  label: id,
  description: "",
  need_category: null,
  primary_narrative_id: primary,
  first_session_id: "S1",
  occurrences: [{ session_id: "S1", summary: [], quotes: [] }],
});
const e = (source: string, target: string) => ({ id: `${source}-${target}`, source, target, explanation: "", session_ids: ["S1"] });

const graph: ClientGraph = {
  client: { id: "C", name: "Nora", created_at: "" },
  sessions: [],
  nodes: [n("A", "narrative"), n("B", "narrative"), n("Z", "narrative"), n("x", "belief", "A"), n("y", "need", "A"), n("w", "value")],
  edges: [e("x", "A"), e("x", "B"), e("y", "A"), e("w", "B")],
  questions: [],
};

describe("buildClientModel", () => {
  const m = buildClientModel(graph);

  it("clusters by primary narrative; nodes without one join a connected narrative", () => {
    expect(m.clusters.get("A")!.map((x) => x.id)).toEqual(["x", "y"]);
    expect(m.clusters.get("B")!.map((x) => x.id)).toEqual(["w"]);
    expect(m.clusters.get("Z")).toEqual([]);
  });

  it("members include edge-connected nodes from other clusters", () => {
    expect(m.members.get("A")!.map((x) => x.id)).toEqual(["x", "y"]);
    expect(m.members.get("B")!.map((x) => x.id)).toEqual(["w", "x"]);
  });

  it("links narratives that share an attached node", () => {
    expect(m.narrativeLinks).toEqual([{ id: "nl:A|B", source: "A", target: "B", weight: 1 }]);
  });
});
