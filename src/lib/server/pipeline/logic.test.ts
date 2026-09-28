import { describe, expect, it } from "vitest";
import type { Utterance } from "../../types";
import {
  cleanExtraction,
  firstSessionDecisions,
  planMerge,
  titleCase,
  validateExtraction,
  validateMerge,
  verifyQuotes,
  type ExistingNode,
} from "./logic";
import type { Extraction } from "./schemas";

const u = (index: number, speaker: string, text: string): Utterance => ({
  index,
  timestamp: index * 10,
  timestamp_label: `0:${String(index * 10).padStart(2, "0")}`,
  speaker,
  text,
});

const UTTS = [
  u(0, "Therapist", "How was your week?"),
  u(1, "Nora", "Honestly? I felt like I didn't count. Nobody asked me what I wanted."),
  u(2, "Therapist", "That sounds painful."),
  u(3, "Nora", "I just poured another glass of wine and went to bed without talking to anyone about any of it at all really."),
];

const node = (temp_id: string, type: Extraction["nodes"][number]["type"], label = temp_id) => ({
  temp_id,
  type,
  label,
  description: `${label} desc`,
  summary: [`${label} summary`],
  need_category: type === "need" ? "Identity" : null,
  quotes: [{ utterance_index: 1, text: "I didn't count" }],
});

describe("verifyQuotes", () => {
  it("keeps a quote found in the referenced client utterance (case/punctuation-insensitive)", () => {
    expect(verifyQuotes([{ utterance_index: 1, text: "I Didn’t count." }], UTTS, "Nora")).toEqual([
      { utterance_index: 1, text: "I Didn’t count." },
    ]);
  });

  it("finds the right utterance when the index is off", () => {
    expect(verifyQuotes([{ utterance_index: 0, text: "poured another glass of wine" }], UTTS, "Nora")).toEqual([
      { utterance_index: 3, text: "poured another glass of wine" },
    ]);
  });

  it("falls back to the first ~20 words of the referenced client utterance", () => {
    const [q] = verifyQuotes([{ utterance_index: 3, text: "something she never said" }], UTTS, "Nora");
    expect(q.utterance_index).toBe(3);
    expect(q.text.split(" ")).toHaveLength(20);
    expect(q.text.endsWith("…")).toBe(true);
  });

  it("drops quotes that can't be traced to a client utterance", () => {
    expect(verifyQuotes([{ utterance_index: 2, text: "made up" }], UTTS, "Nora")).toEqual([]);
    expect(verifyQuotes([{ utterance_index: 99, text: "made up" }], UTTS, "Nora")).toEqual([]);
  });
});

describe("validateExtraction / cleanExtraction", () => {
  const ex: Extraction = {
    nodes: [node("n1", "narrative"), node("n2", "need"), node("n3", "belief")],
    edges: [
      { source_temp_id: "n2", target_temp_id: "n1", explanation: "x" },
      { source_temp_id: "n1", target_temp_id: "n2", explanation: "dup" },
      { source_temp_id: "n3", target_temp_id: "n3", explanation: "loop" },
    ],
  };

  it("flags non-narratives without a narrative edge and bad edge refs", () => {
    const errors = validateExtraction({ ...ex, edges: [...ex.edges, { source_temp_id: "n9", target_temp_id: "n1", explanation: "" }] });
    expect(errors.some((e) => e.includes('"n3"') && e.includes("narrative"))).toBe(true);
    expect(errors.some((e) => e.includes('"n9"'))).toBe(true);
  });

  it("dedupes edges and removes self-loops", () => {
    const cleaned = cleanExtraction(ex, UTTS, "Nora");
    expect(cleaned.edges).toHaveLength(1);
  });
});

describe("merge", () => {
  const existing: ExistingNode[] = [
    { id: "E-nar", type: "narrative", label: "The Dutiful Daughter", description: "", primary_narrative_id: null },
    { id: "E-need", type: "need", label: "Recognition", description: "", primary_narrative_id: "E-nar" },
  ];
  const ex: Extraction = {
    nodes: [node("n1", "narrative"), node("n2", "need", "Recognition and Being Seen"), node("n3", "need", "Being Seen"), node("n4", "belief")],
    edges: [
      { source_temp_id: "n2", target_temp_id: "n1", explanation: "a" },
      { source_temp_id: "n3", target_temp_id: "n1", explanation: "b" },
      { source_temp_id: "n4", target_temp_id: "n1", explanation: "c" },
      { source_temp_id: "n2", target_temp_id: "n3", explanation: "collapses to self-loop" },
    ],
  };

  it("validates types, ids and primary narratives", () => {
    const errors = validateMerge(
      {
        decisions: [
          { temp_id: "n1", action: "match", existing_id: "E-need", primary_narrative_id: null },
          { temp_id: "n2", action: "match", existing_id: "E-need", primary_narrative_id: "n4" },
          { temp_id: "n4", action: "new", existing_id: null, primary_narrative_id: "E-nar" },
        ],
      },
      ex.nodes,
      existing,
    );
    expect(errors.join("\n")).toMatch(/types must be equal/);
    expect(errors.join("\n")).toMatch(/"n2" needs primary_narrative_id/);
    expect(errors.join("\n")).toMatch(/Missing decision for "n3"/);
  });

  it("plans: matched nodes get occurrences, duplicates collapse, edges dedupe", () => {
    let i = 0;
    const plan = planMerge({
      clientId: "C",
      sessionId: "S2",
      extraction: ex,
      decisions: {
        decisions: [
          { temp_id: "n1", action: "match", existing_id: "E-nar", primary_narrative_id: null },
          { temp_id: "n2", action: "match", existing_id: "E-need", primary_narrative_id: "n1" },
          { temp_id: "n3", action: "match", existing_id: "E-need", primary_narrative_id: "n1" },
          { temp_id: "n4", action: "new", existing_id: null, primary_narrative_id: "n1" },
        ],
      },
      existingNodes: existing,
      existingEdges: [{ id: "E1", source_node_id: "E-nar", target_node_id: "E-need", session_ids: ["S1"] }],
      newId: () => `new-${++i}`,
    });

    expect(plan.nodesToInsert).toEqual([
      expect.objectContaining({ id: "new-1", type: "belief", primary_narrative_id: "E-nar", first_session_id: "S2" }),
    ]);
    // n2 and n3 both land on E-need → one occurrence with both summaries
    const need = plan.occurrences.find((o) => o.node_id === "E-need")!;
    expect(need.summary).toHaveLength(2);
    expect(plan.occurrences).toHaveLength(3);
    // n2–n1 and n3–n1 both map to the existing E-need–E-nar edge; n2–n3 becomes a self-loop
    expect(plan.edgesToTouch).toEqual([{ id: "E1", session_ids: ["S1", "S2"] }]);
    expect(plan.edgesToInsert).toEqual([expect.objectContaining({ source_node_id: "new-1", target_node_id: "E-nar" })]);
    expect(plan.primaryUpdates).toEqual([]);
  });

  it("first session: everything new, primaries from edges, narratives inserted first", () => {
    let i = 0;
    const decisions = firstSessionDecisions(ex);
    expect(validateMerge(decisions, ex.nodes, [])).toEqual([]);
    const plan = planMerge({
      clientId: "C",
      sessionId: "S1",
      extraction: ex,
      decisions,
      existingNodes: [],
      existingEdges: [],
      newId: () => `id-${++i}`,
    });
    expect(plan.nodesToInsert[0].type).toBe("narrative");
    expect(plan.nodesToInsert.filter((n) => n.type !== "narrative").every((n) => n.primary_narrative_id === plan.idMap.n1)).toBe(true);
    expect(plan.edgesToInsert).toHaveLength(4);
  });
});

describe("titleCase", () => {
  it.each([
    ["Numbing With Wine", "Numbing with Wine"],
    ["Echoes Of Father", "Echoes of Father"],
    ["The Dutiful Daughter", "The Dutiful Daughter"],
    ["Recognition And Being Seen", "Recognition and Being Seen"],
    ["Where I Come From", "Where I Come From"],
  ])("%s → %s", (input, out) => expect(titleCase(input)).toBe(out));
});
