import { z } from "zod";
import { MAX_TRANSCRIPT_CHARS } from "@/lib/config";
import { createSession } from "@/lib/server/pipeline/steps";
import { isUuid } from "@/lib/server/queries";
import { checkRateLimit, clientIp, recordWrite } from "@/lib/server/rate-limit";
import { TranscriptParseError } from "@/lib/transcript";

const bodySchema = z
  .object({
    transcript: z.string().trim().min(1, "Transcript is empty.").max(MAX_TRANSCRIPT_CHARS, "Transcript is too long."),
    clientId: z.string().refine(isUuid).optional(),
    newClientName: z.string().trim().min(1).max(120).optional(),
    sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    acknowledged: z.literal(true, { error: "Please confirm no real client data is being uploaded." }),
  })
  .refine((b) => b.clientId || b.newClientName, { message: "Pick a client." });

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const ip = clientIp(req);
  const limited = await checkRateLimit(ip);
  if (limited) return limited;

  try {
    const { transcript, clientId, newClientName, sessionDate } = parsed.data;
    const created = await createSession({ transcript, clientId, newClientName: clientId ? undefined : newClientName, sessionDate });
    await recordWrite(ip);
    return Response.json(created);
  } catch (err) {
    if (err instanceof TranscriptParseError) return Response.json({ error: err.message }, { status: 400 });
    console.error("[sessions:create]", err);
    return Response.json({ error: "Couldn't create the session." }, { status: 500 });
  }
}
