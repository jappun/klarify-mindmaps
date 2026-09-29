import { z } from "zod";
import { db, must } from "@/lib/server/db";
import { checkRateLimit, clientIp, recordWrite } from "@/lib/server/rate-limit";

const body = z.object({ name: z.string().trim().min(1, "Enter a name.").max(120) });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const ip = clientIp(req);
  const limited = await checkRateLimit(ip);
  if (limited) return limited;

  try {
    const client = must(
      await db().from("clients").insert({ name: parsed.data.name }).select("id, name").single(),
      "create client",
    ) as { id: string; name: string };
    await recordWrite(ip);
    return Response.json(client);
  } catch (err) {
    console.error("[clients:create]", err);
    return Response.json({ error: "Couldn't create the client." }, { status: 500 });
  }
}
