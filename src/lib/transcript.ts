import type { Utterance } from "./types";

export type ParsedTranscript = {
  header: { date?: string; client?: string; therapist?: string };
  utterances: Utterance[];
  /** Speaker label used for the client (quotes must come from this speaker). */
  clientSpeaker: string | null;
};

export class TranscriptParseError extends Error {}

// "[4:43] Nora:" or "[1:02:03] Nora: text on the same line"
const LINE_RE = /^\[(?:(\d+):)?(\d{1,2}):(\d{2})\]\s*([^:\]]+?)\s*:\s*(.*)$/;
const RULE_RE = /^\s*={3,}\s*$/;
const THERAPIST_RE = /^(therapist|counsell?or|clinician|dr\.?\s)/i;

export function formatTimestamp(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function parseHeader(lines: string[]) {
  const header: ParsedTranscript["header"] = {};
  for (const line of lines) {
    const m = line.match(/^\s*(date|client|therapist)\s*:\s*(.+?)\s*$/i);
    if (m) header[m[1].toLowerCase() as keyof typeof header] = m[2];
  }
  return header;
}

export function parseTranscript(raw: string): ParsedTranscript {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");

  // Body starts after the "=====" rule, or at the first timestamp line if there's no rule.
  let start = lines.findIndex((l) => RULE_RE.test(l));
  if (start === -1) start = lines.findIndex((l) => LINE_RE.test(l.trim())) - 1;
  const header = parseHeader(lines.slice(0, Math.max(start, 0)));

  const utterances: Utterance[] = [];
  let current: { timestamp: number; speaker: string; text: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const text = current.text.join(" ").replace(/\s+/g, " ").trim();
    if (text) {
      utterances.push({
        index: utterances.length,
        timestamp: current.timestamp,
        timestamp_label: formatTimestamp(current.timestamp),
        speaker: current.speaker,
        text,
      });
    }
    current = null;
  };

  for (const line of lines.slice(start + 1)) {
    const m = line.trim().match(LINE_RE);
    if (m) {
      flush();
      const [, h, mm, ss, speaker, rest] = m;
      current = {
        timestamp: Number(h ?? 0) * 3600 + Number(mm) * 60 + Number(ss),
        speaker: speaker.trim(),
        text: rest ? [rest] : [],
      };
    } else if (current && line.trim()) {
      current.text.push(line.trim());
    }
  }
  flush();

  if (utterances.length === 0) {
    throw new TranscriptParseError(
      'Couldn\'t find any timestamped lines. Each utterance should start with a line like "[4:43] Nora:".',
    );
  }

  return { header, utterances, clientSpeaker: detectClientSpeaker(utterances, header) };
}

function detectClientSpeaker(utterances: Utterance[], header: ParsedTranscript["header"]): string | null {
  const counts = new Map<string, number>();
  for (const u of utterances) counts.set(u.speaker, (counts.get(u.speaker) ?? 0) + 1);
  const speakers = [...counts.keys()];

  // 1. Header "Client: Nora Castillo" → a speaker matching any part of that name.
  if (header.client) {
    const parts = header.client.toLowerCase().split(/\s+/);
    const hit = speakers.find((s) => parts.includes(s.toLowerCase()) || s.toLowerCase() === header.client!.toLowerCase());
    if (hit) return hit;
  }
  // 2. Anyone who isn't the therapist, most talkative first.
  const therapist = header.therapist?.toLowerCase();
  const others = speakers
    .filter((s) => !THERAPIST_RE.test(s) && s.toLowerCase() !== therapist && !therapist?.split(/\s+/).includes(s.toLowerCase()))
    .sort((a, b) => counts.get(b)! - counts.get(a)!);
  return others[0] ?? null;
}

/** "[#37 4:43] Nora: ..." — the format fed to the extraction prompt. */
export function utterancesForPrompt(utterances: Utterance[]) {
  return utterances.map((u) => `[#${u.index} ${u.timestamp_label}] ${u.speaker}: ${u.text}`).join("\n");
}
