import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatTimestamp, parseTranscript, TranscriptParseError } from "./transcript";

const load = (n: number) => readFileSync(join(__dirname, `../../transcripts/nora_session_${n}.txt`), "utf8");

describe("parseTranscript on the Nora transcripts", () => {
  it.each([
    [1, 70, "8:52"],
    [2, 90, "9:14"],
    [3, 96, "10:22"],
  ])("session %i: %i utterances, last at %s", (n, count, lastLabel) => {
    const t = parseTranscript(load(n));
    expect(t.utterances).toHaveLength(count);
    expect(t.utterances.at(-1)!.timestamp_label).toBe(lastLabel);
    expect(t.clientSpeaker).toBe("Nora");
    expect(t.header.client).toBe("Nora Castillo");
    expect(new Set(t.utterances.map((u) => u.speaker))).toEqual(new Set(["Therapist", "Nora"]));
    t.utterances.forEach((u, i) => expect(u.index).toBe(i));
  });

  it("parses the first utterances of session 1", () => {
    const [first, second] = parseTranscript(load(1)).utterances;
    expect(first).toEqual({
      index: 0,
      timestamp: 0,
      timestamp_label: "0:00",
      speaker: "Therapist",
      text: "Hi Nora, come on in. Have a seat wherever you like.",
    });
    expect(second.timestamp).toBe(4);
    expect(second.text).toMatch(/^Thanks\. Sorry, I came straight from work/);
  });

  it("keeps timestamps monotonic", () => {
    for (const n of [1, 2, 3]) {
      const ts = parseTranscript(load(n)).utterances.map((u) => u.timestamp);
      expect([...ts].sort((a, b) => a - b)).toEqual(ts);
    }
  });
});

describe("parseTranscript tolerance", () => {
  it("handles no header, [h:mm:ss], same-line text, multi-line text and CRLF", () => {
    const raw = [
      "[0:59:58] Dr. Smith:",
      "How are you?",
      "",
      "[1:00:03] Sam: I'm okay.",
      "Mostly tired.",
    ].join("\r\n");
    const t = parseTranscript(raw);
    expect(t.utterances).toEqual([
      { index: 0, timestamp: 3598, timestamp_label: "59:58", speaker: "Dr. Smith", text: "How are you?" },
      { index: 1, timestamp: 3603, timestamp_label: "1:00:03", speaker: "Sam", text: "I'm okay. Mostly tired." },
    ]);
    expect(t.clientSpeaker).toBe("Sam");
  });

  it("uses a Therapist header line to find the client", () => {
    const raw = "Therapist: Jane Doe\n=====\n[0:00] Jane:\nHi.\n[0:02] Alex:\nHey.\n[0:05] Jane:\nOk.";
    expect(parseTranscript(raw).clientSpeaker).toBe("Alex");
  });

  it("rejects text without timestamps", () => {
    expect(() => parseTranscript("just some notes\nno timestamps")).toThrow(TranscriptParseError);
  });

  it("formats timestamps", () => {
    expect(formatTimestamp(283)).toBe("4:43");
    expect(formatTimestamp(3723)).toBe("1:02:03");
  });
});
