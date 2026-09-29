import { db } from "./db";

// Abuse guard for the public demo: writes (uploads, new clients) per IP per hour.
const WRITES_PER_HOUR = 20;

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}

/** Returns a 429 response if this IP is over the limit, else null. */
export async function checkRateLimit(ip: string): Promise<Response | null> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db()
    .from("upload_log")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);
  if ((count ?? 0) < WRITES_PER_HOUR) return null;
  return Response.json({ error: "Limit reached for this demo. Please try again in an hour." }, { status: 429 });
}

export async function recordWrite(ip: string) {
  await db().from("upload_log").insert({ ip });
}
