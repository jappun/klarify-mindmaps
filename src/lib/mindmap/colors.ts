import type { NodeType } from "../types";

// Klarify's categoryConfig colors.
export const NODE_COLORS: Record<NodeType, string> = {
  narrative: "#ff6b6b",
  belief: "#4ecdc4",
  strategy: "#45b7d1",
  need: "#96ceb4",
  value: "#feca57",
};

/** "From other sessions" — derived from Klarify's cloud grays. */
export const OTHER_SESSION_FILL = "#e0e0e0";
export const OTHER_SESSION_STROKE = "#cfcfcf";

export const TYPE_LABEL: Record<NodeType, string> = {
  narrative: "Narrative",
  belief: "Belief",
  strategy: "Strategy",
  need: "Need",
  value: "Value",
};

export const TYPE_LABEL_PLURAL: Record<NodeType, string> = {
  narrative: "Narratives",
  belief: "Beliefs",
  strategy: "Strategies",
  need: "Needs",
  value: "Values",
};
