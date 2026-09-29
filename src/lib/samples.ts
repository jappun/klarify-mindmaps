// Sample sessions offered in the Upload text modal, so anyone trying the demo can run the full flow
// (create client → upload → live processing) without their own transcripts.
// Transcripts live in public/samples/<id>/session-<n>.txt.

export type SampleSet = {
  id: string;
  /** Menu heading. */
  label: string;
  /** The fictional client these sessions belong to. */
  clientName: string;
  sessionCount: number;
};

// TODO: set the fictional client names once the transcripts are in.
export const SAMPLE_SETS: SampleSet[] = [
  { id: "moody", label: "Sample 1 – for Moody", clientName: "Sample Client One", sessionCount: 4 },
  { id: "bergie", label: "Sample 2 – for Bergie", clientName: "Sample Client Two", sessionCount: 4 },
];

export const sampleUrl = (set: SampleSet, n: number) => `/samples/${set.id}/session-${n}.txt`;

/** Sessions a week apart, with the last one today: session n of N is (N − n) weeks ago. */
export function sampleSessionDate(set: SampleSet, n: number, today = new Date()) {
  const d = new Date(today);
  d.setDate(d.getDate() - 7 * (set.sessionCount - n));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
