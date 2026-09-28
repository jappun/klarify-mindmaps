import { z } from "zod";
import { createQuestion, questionErrorResponse } from "@/lib/server/questions";

const body = z.object({
  sessionId: z.string(),
  nodeId: z.string(),
  text: z.string().trim().min(1, "Question is empty.").max(500),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    return Response.json(await createQuestion(parsed.data));
  } catch (err) {
    return questionErrorResponse(err);
  }
}
