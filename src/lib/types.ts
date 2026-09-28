export const NODE_TYPES = ["narrative", "belief", "strategy", "need", "value"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export type SessionStatus = "processing" | "ready" | "failed";
export const PIPELINE_STEPS = ["extract", "merge", "reflections"] as const;
export type PipelineStep = (typeof PIPELINE_STEPS)[number];

export type Utterance = {
  index: number;
  timestamp: number;
  timestamp_label: string;
  speaker: string;
  text: string;
};

export type Client = {
  id: string;
  name: string;
  created_at: string;
};

export type ClientSummary = Client & {
  session_count: number;
  last_session_at: string | null;
};

export type Session = {
  id: string;
  client_id: string;
  session_number: number;
  session_date: string; // YYYY-MM-DD
  status: SessionStatus;
  failed_step: PipelineStep | null;
  created_at: string;
};

export type SessionWithClient = Session & { client_name: string };

// ---- Graph, as sent to the mindmap / modal UI ----

export type Quote = {
  utterance_index: number;
  text: string;
  timestamp_label: string;
  /** Up to 3 utterances before and after, including the quoted one. */
  context: Utterance[];
};

export type Occurrence = {
  session_id: string;
  summary: string[];
  quotes: Quote[];
};

export type GraphNode = {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  need_category: string | null;
  primary_narrative_id: string | null;
  first_session_id: string;
  /** Ordered by session number. */
  occurrences: Occurrence[];
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  explanation: string;
  session_ids: string[];
};

export type ReflectionQuestion = {
  id: string;
  session_id: string;
  node_id: string;
  text: string;
  source: "ai" | "therapist";
  created_at: string;
};

export type ClientGraph = {
  client: Client;
  /** Ready sessions only, ascending by session number. */
  sessions: Session[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  questions: ReflectionQuestion[];
};
