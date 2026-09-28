export const NODE_TYPES = ["narrative", "belief", "strategy", "need", "value"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export type SessionStatus = "processing" | "ready" | "failed";
export type PipelineStep = "extract" | "merge" | "reflections";

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
