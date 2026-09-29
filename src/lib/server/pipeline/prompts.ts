import type { NodeType } from "../../types";

const TYPE_DEFINITIONS = `Node types:
- narrative: an overarching story the client lives by or tells about themselves.
- belief: a rule or assumption the client holds (often implicit).
- strategy: a coping behavior or pattern, adaptive or not.
- need: something the client lacks or longs for.
- value: something the client cares about or is guided by.`;

const STYLE_EXAMPLES = `Label style (1–5 words, Title Case), e.g.:
- narrative: "The Dutiful Daughter", "The Selfless Caregiver", "The Invisible Anger"
- belief: "Expressing Anger Makes Things Worse", "My Life Matters Less", "Having Limits Makes Me Monstrous"
- strategy: "Numbing with Wine", "Walking Before Wine", "Avoidance of Painful Emotions"
- need: "Recognition and Being Seen", "Rest and Restoration", "Solitude and Space"
- value: "Fairness and Justice", "Family and Loyalty", "Authenticity and Honesty"
Description style: one short fragment, e.g. "Need to be asked, consulted, valued as person with own life".`;

export function extractPrompt({ transcript, clientSpeaker }: { transcript: string; clientSpeaker: string | null }) {
  return `You help a therapist build a mindmap of a client's inner world from one therapy session transcript.

${TYPE_DEFINITIONS}

${STYLE_EXAMPLES}

Instructions:
- Extract the themes that matter for this client in THIS session. Prefer fewer, meaningful nodes: roughly 12–20 in total, including 2–5 narratives.
- Do not create near-duplicates within the session (e.g. "Rest" and "Rest and Restoration" should be one node).
- summary: 1–3 short bullets about how the theme showed up in this session, specific to what was said.
- need_category: only for needs (e.g. Identity, Connection, Safety, Autonomy, Rest, Competence, Meaning); null otherwise.
- quotes: 1–2 supporting quotes. utterance_index is the # number of an utterance spoken by the client${
    clientSpeaker ? ` ("${clientSpeaker}")` : ""
  }, never the therapist. text must be copied exactly from that utterance, 20 words or fewer.
- edges connect related nodes, each with a one-sentence explanation of how they relate for this client.
- Every non-narrative node must connect to at least one narrative via an edge.
- temp_ids must be unique (n1, n2, ...). Edges may only reference those temp_ids.

Transcript (each line is [#index timestamp] Speaker: text):
${transcript}`;
}

export type MergeExisting = { id: string; type: NodeType; label: string; description: string; summary: string[] };
export type MergeCandidate = {
  temp_id: string;
  type: NodeType;
  label: string;
  description: string;
  summary: string[];
  connects_to: string[];
};

export function mergePrompt({ existing, candidates }: { existing: MergeExisting[]; candidates: MergeCandidate[] }) {
  return `You maintain one client's therapy mindmap across sessions. New candidate nodes were extracted from the latest session. Decide, for each candidate, whether it is the same theme as an existing node.

${TYPE_DEFINITIONS}

Matching rules:
- Match when two nodes describe the same underlying theme, even with different wording ("Rest" vs "Rest and Restoration", "Recognition" vs "Recognition and Being Seen", "Caring for Mom" vs "The Dutiful Daughter" if both describe the same story).
- Use the summaries to judge what each node is really about, not just the labels.
- Do not match merely because two nodes share a topic. A different way of coping (for example, a healthier alternative that replaces an old habit) is a new strategy, and a belief that contradicts an old one is a new belief.
- Before choosing "new", check every existing node of the same type. Choose "new" only if the theme is genuinely absent from the map.
- Only match nodes of the same type.
- When in doubt, match. Fragmentation across sessions is the problem we are solving.
- Two candidates may match the same existing node.
- Output exactly one decision per candidate temp_id. For "match", existing_id is the existing node's id; for "new", existing_id is null.

Primary narrative:
- For every non-narrative candidate (matched or new), set primary_narrative_id to the narrative it belongs to most: either an existing narrative's id or a candidate narrative's temp_id. Prefer a narrative the candidate connects to.
- For narrative candidates, primary_narrative_id is null.

Existing nodes (JSON; summary is from the most recent session each appeared in):
${JSON.stringify(existing)}

Candidates from the latest session (JSON; connects_to lists candidate temp_ids it has edges with):
${JSON.stringify(candidates)}`;
}

export type ReflectionNode = { id: string; type: NodeType; label: string; description: string; summary: string[] };

export function reflectionsPrompt({ nodes }: { nodes: ReflectionNode[] }) {
  return `You write reflection questions a therapist can share with their client after a session.

Write 6–8 questions. Each must be linked to one node below via node_id (use each node at most once; cover a mix of types, favoring beliefs, needs and narratives).

Tone: open, gentle, curious, second person, one sentence, ending with "?". Grounded in what the client said this session. No clinical jargon, no advice, no yes/no questions.
Examples of the tone:
- "Who in your life has truly asked what you wanted before assuming your answer?"
- "What would change if having human limits made you human rather than monstrous?"
- "What becomes possible when you have space where no one needs anything from you?"

This session's nodes (JSON):
${JSON.stringify(nodes)}`;
}
