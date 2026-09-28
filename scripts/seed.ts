// Seeds Nora Castillo's three sessions by running the real pipeline (SPEC §12).
//   npm run seed          — seed (fails if Nora already exists)
//   npm run reset         — wipe all data, then seed
// LLM responses are cached in data/seed-cache/, so re-seeding with the same model + prompts needs no API calls.
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.LLM_CACHE_DIR ??= join(process.cwd(), "data/seed-cache");

// Imported after LLM_CACHE_DIR is set.
import { db, must } from "../src/lib/server/db";
import { geminiModel } from "../src/lib/server/gemini";
import { createSession, runStep } from "../src/lib/server/pipeline/steps";
import { PIPELINE_STEPS } from "../src/lib/types";

const CLIENT = "Nora Castillo";
const SESSIONS = [
  { file: "nora_session_1.txt", date: "2026-09-14" },
  { file: "nora_session_2.txt", date: "2026-09-21" },
  { file: "nora_session_3.txt", date: "2026-09-28" },
];
// Sessions were at 5:30 PM Toronto time (EDT, UTC-4).
const at530 = (date: string) => `${date}T21:30:00Z`;

async function wipe() {
  must(await db().from("clients").delete().not("id", "is", null).select("id"), "wipe clients");
  must(await db().from("upload_log").delete().not("id", "is", null).select("id"), "wipe upload log");
  console.log("Wiped all data.");
}

async function seed() {
  const existing = must(await db().from("clients").select("id").eq("name", CLIENT), "check existing") as { id: string }[];
  if (existing.length) throw new Error(`${CLIENT} already exists. Run \`npm run reset\` to wipe and re-seed.`);

  console.log(`Model: ${geminiModel()} · cache: ${process.env.LLM_CACHE_DIR}`);
  let clientId: string | undefined;
  for (const { file, date } of SESSIONS) {
    const transcript = readFileSync(join(process.cwd(), "transcripts", file), "utf8");
    const created = await createSession({
      transcript,
      clientId,
      newClientName: CLIENT,
      sessionDate: date,
      createdAt: at530(date),
    });
    clientId = created.clientId;
    for (const step of PIPELINE_STEPS) {
      const t = Date.now();
      await runStep(created.sessionId, step);
      console.log(`  ${file} · ${step} ✓ (${((Date.now() - t) / 1000).toFixed(1)}s)`);
    }
  }
  await report(clientId!);
}

/** Print the resulting graph so duplicates are easy to eyeball. */
async function report(clientId: string) {
  const nodes = must(await db().from("nodes").select("id, type, label").eq("client_id", clientId), "report nodes") as {
    id: string;
    type: string;
    label: string;
  }[];
  const occ = must(
    await db().from("node_occurrences").select("node_id, sessions(session_number)").in("node_id", nodes.map((n) => n.id)),
    "report occurrences",
  ) as unknown as { node_id: string; sessions: { session_number: number } }[];
  const edges = must(await db().from("edges").select("id").eq("client_id", clientId), "report edges") as unknown[];
  const qs = must(await db().from("reflection_questions").select("id, sessions!inner(client_id)").eq("sessions.client_id", clientId), "report questions") as unknown[];

  const sessionsOf = (id: string) => occ.filter((o) => o.node_id === id).map((o) => o.sessions.session_number).sort();
  console.log(`\n${nodes.length} nodes (from ${occ.length} node-mentions across sessions), ${edges.length} edges, ${qs.length} questions`);
  for (const type of ["narrative", "belief", "strategy", "need", "value"]) {
    const ofType = nodes.filter((n) => n.type === type);
    console.log(`\n${type} (${ofType.length})`);
    for (const n of ofType) console.log(`  ${n.label.padEnd(42)} S${sessionsOf(n.id).join(",S")}`);
  }
}

async function main() {
  if (process.argv.includes("--reset")) await wipe();
  await seed();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
