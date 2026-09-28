// TEMPORARY fixture for the static UI pass (build step 1). Replaced by Supabase queries in step 2.
import type { ClientSummary, Session, SessionWithClient } from "./types";

const NORA = { id: "c0000000-0000-4000-8000-000000000001", name: "Nora Castillo", created_at: "2026-09-14T17:30:00Z" };

const SESSIONS: Session[] = [1, 2, 3].map((n) => ({
  id: `s0000000-0000-4000-8000-00000000000${n}`,
  client_id: NORA.id,
  session_number: n,
  session_date: `2026-09-${String(7 + n * 7).padStart(2, "0")}`,
  status: "ready",
  failed_step: null,
  created_at: `2026-09-${String(7 + n * 7).padStart(2, "0")}T17:30:00Z`,
}));

export async function listClients(): Promise<ClientSummary[]> {
  return [{ ...NORA, session_count: SESSIONS.length, last_session_at: SESSIONS.at(-1)!.created_at }];
}

export async function getClient(id: string): Promise<ClientSummary | null> {
  return (await listClients()).find((c) => c.id === id) ?? null;
}

export async function listRecentSessions(): Promise<SessionWithClient[]> {
  return [...SESSIONS].reverse().map((s) => ({ ...s, client_name: NORA.name }));
}

export async function listClientSessions(clientId: string): Promise<Session[]> {
  return SESSIONS.filter((s) => s.client_id === clientId).reverse();
}

export async function getSession(id: string): Promise<SessionWithClient | null> {
  const s = SESSIONS.find((x) => x.id === id);
  return s ? { ...s, client_name: NORA.name } : null;
}
