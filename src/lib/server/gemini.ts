// Gemini structured-output helper. Server-only.
import { createHash } from "node:crypto";
import { mkdir, readFile, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

let ai: GoogleGenAI | null = null;
function client() {
  if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
  ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai;
}

export const geminiModel = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

/** Per-call timeout; keeps us under the route's maxDuration so failures are recorded, not killed. */
const CALL_TIMEOUT_MS = 90_000;

export class LlmError extends Error {}

function jsonSchemaFor(schema: z.ZodType) {
  const json = z.toJSONSchema(schema, { target: "draft-2020-12" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/**
 * Generate JSON matching `schema`. `validate` adds semantic checks (return error strings).
 * On a validation failure, retries once with the errors appended to the prompt, then throws.
 */
export async function generateStructured<T>({
  label,
  prompt,
  schema,
  validate,
}: {
  label: string;
  prompt: string;
  schema: z.ZodType<T>;
  validate?: (value: T) => string[];
}): Promise<T> {
  let attemptPrompt = prompt;
  let lastErrors: string[] = [];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await callModel(attemptPrompt, schema);
    const errors = check(raw, schema, validate);
    if (errors.ok) return errors.value;

    lastErrors = errors.errors;
    console.warn(`[llm:${label}] attempt ${attempt} failed validation:`, lastErrors.slice(0, 5));
    attemptPrompt =
      `${prompt}\n\n---\nYour previous response was invalid. Fix these problems and return the full corrected JSON:\n` +
      lastErrors.map((e) => `- ${e}`).join("\n") +
      `\n\nPrevious response:\n${raw}`;
  }
  throw new LlmError(`${label}: model output failed validation twice (${lastErrors.slice(0, 3).join("; ")})`);
}

function check<T>(raw: string, schema: z.ZodType<T>, validate?: (v: T) => string[]) {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false as const, errors: ["Response was not valid JSON."] };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  const semantic = validate?.(parsed.data) ?? [];
  return semantic.length ? { ok: false as const, errors: semantic } : { ok: true as const, value: parsed.data };
}

async function callModel(prompt: string, schema: z.ZodType): Promise<string> {
  const model = geminiModel();
  const cacheDir = process.env.LLM_CACHE_DIR;
  const key = createHash("sha256").update(`${model}\n${prompt}`).digest("hex").slice(0, 24);

  if (cacheDir) {
    const file = join(cacheDir, `${key}.json`);
    const hit = await readFile(file, "utf8").catch(() => null);
    if (hit) {
      // Touch on use so the seed script can prune entries no longer referenced.
      await utimes(file, new Date(), new Date()).catch(() => {});
      return hit;
    }
  }

  const res = await withTransientRetry(() =>
    client().models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchemaFor(schema),
        temperature: 0.2,
        abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
      },
    }),
  );
  const text = res.text;
  if (!text) throw new LlmError(`Empty response from ${model} (finish: ${res.candidates?.[0]?.finishReason ?? "unknown"})`);

  if (cacheDir) {
    await mkdir(cacheDir, { recursive: true });
    await writeFile(join(cacheDir, `${key}.json`), text);
  }
  return text;
}

const TRANSIENT = /\b(429|500|502|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand|ECONNRESET|fetch failed/i;

/** Retry rate limits / overloads / network blips with backoff (1.5s, 4s). Validation retries are separate. */
async function withTransientRetry<T>(fn: () => Promise<T>, delays = [1500, 4000]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt >= delays.length || !TRANSIENT.test(msg)) throw err;
      console.warn(`[llm] transient error, retrying in ${delays[attempt]}ms: ${msg.slice(0, 160)}`);
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
}
