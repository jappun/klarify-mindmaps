// Sample sessions offered in the Upload text modal, so anyone trying the demo can run the full flow
// (create client → upload → live processing) without their own transcripts.
// Transcripts live in public/samples/<id>/<clientname>_session_<n>.txt, e.g. moody/bob_session_1.txt.

export type SampleSet = {
  id: string;
  /** Who the set is for, shown in the menu: "For Moody - Bob Session 1". */
  label: string;
  /** The fictional client these sessions belong to. */
  clientName: string;
  sessionCount: number;
};

export const SAMPLE_SETS: SampleSet[] = [
  { id: "moody", label: "For Moody", clientName: "Bob", sessionCount: 4 },
  { id: "bergie", label: "For Bergie", clientName: "Sam", sessionCount: 4 },
];

export const sampleTitle = (set: SampleSet, n: number) => `${set.label} - ${set.clientName} Session ${n}`;

export const sampleUrl = (set: SampleSet, n: number) =>
  `/samples/${set.id}/${set.clientName.toLowerCase()}_session_${n}.txt`;

/** Sessions a week apart, with the last one today: session n of N is (N − n) weeks ago. */
export function sampleSessionDate(set: SampleSet, n: number, today = new Date()) {
  const d = new Date(today);
  d.setDate(d.getDate() - 7 * (set.sessionCount - n));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
