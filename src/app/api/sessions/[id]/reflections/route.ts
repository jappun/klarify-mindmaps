import { handleStep } from "@/lib/server/pipeline/handler";

// Hobby + Fluid compute allows up to 300s. Each step makes at most 2 LLM calls (90s timeout each).
export const maxDuration = 300;

export function POST(_req: Request, ctx: RouteContext<"/api/sessions/[id]/reflections">) {
  return handleStep(ctx.params, "reflections");
}
