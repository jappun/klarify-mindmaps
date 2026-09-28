import { z } from "zod";
import { deleteQuestion, questionErrorResponse, updateQuestion } from "@/lib/server/questions";

const patchBody = z
  .object({
    text: z.string().trim().min(1, "Question is empty.").max(500).optional(),
    nodeId: z.string().optional(),
  })
  .refine((b) => b.text || b.nodeId, { message: "Nothing to update." });

export async function PATCH(req: Request, ctx: RouteContext<"/api/questions/[id]">) {
  const { id } = await ctx.params;
  const parsed = patchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    return Response.json(await updateQuestion(id, parsed.data));
  } catch (err) {
    return questionErrorResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/questions/[id]">) {
  const { id } = await ctx.params;
  try {
    await deleteQuestion(id);
    return Response.json({ ok: true });
  } catch (err) {
    return questionErrorResponse(err);
  }
}
