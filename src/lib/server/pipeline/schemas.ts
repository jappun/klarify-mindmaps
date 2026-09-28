import { z } from "zod";
import { NODE_TYPES } from "../../types";

// ---------- Step A: extract ----------

export const extractionSchema = z.object({
  nodes: z
    .array(
      z.object({
        temp_id: z.string().describe('Short unique id, e.g. "n1".'),
        type: z.enum(NODE_TYPES),
        label: z.string().describe("1–5 words, Title Case."),
        description: z.string().describe("One short fragment."),
        summary: z.array(z.string()).min(1).max(3).describe("1–3 short bullets about how it showed up in this session."),
        need_category: z
          .string()
          .nullable()
          .describe("Needs only (e.g. Identity, Connection, Safety, Autonomy, Rest). null for other types."),
        quotes: z
          .array(
            z.object({
              utterance_index: z.number().int().describe("The # index of a CLIENT utterance."),
              text: z.string().describe("Exact excerpt from that utterance, 20 words or fewer."),
            }),
          )
          .min(1)
          .max(2),
      }),
    )
    .min(1),
  edges: z.array(
    z.object({
      source_temp_id: z.string(),
      target_temp_id: z.string(),
      explanation: z.string().describe("One short sentence."),
    }),
  ),
});
export type Extraction = z.infer<typeof extractionSchema>;
export type Candidate = Extraction["nodes"][number];

// ---------- Step B: merge ----------

export const mergeSchema = z.object({
  decisions: z.array(
    z.object({
      temp_id: z.string(),
      action: z.enum(["match", "new"]),
      existing_id: z.string().nullable().describe('Existing node id when action is "match", else null.'),
      primary_narrative_id: z
        .string()
        .nullable()
        .describe("Non-narrative nodes: an existing narrative id or a candidate narrative temp_id. null for narratives."),
    }),
  ),
});
export type MergeResult = z.infer<typeof mergeSchema>;

// ---------- Step C: reflections ----------

export const reflectionsSchema = z.object({
  questions: z
    .array(
      z.object({
        node_id: z.string(),
        text: z.string().describe("One open, gentle, second-person sentence ending in a question mark."),
      }),
    )
    .min(6)
    .max(8),
});
export type Reflections = z.infer<typeof reflectionsSchema>;
