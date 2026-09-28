# Klarify Mindmaps Demo

A working clone of a slice of Klarify showing an improved Mindmap: themes are merged across sessions,
the client map opens on narratives, and the session map separates this session from earlier ones.
See [SPEC.md](SPEC.md) for the full brief.

## Setup

1. Create a Supabase project and run [supabase/schema.sql](supabase/schema.sql) in its SQL editor.
2. Copy `.env.example` to `.env.local` and fill in `GEMINI_API_KEY`, `GEMINI_MODEL`,
   `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. (All database access is server-side
   with the service-role key; RLS is on with no policies, so the anon key isn't needed.)
3. `npm install`, then `npm run seed` to build Nora Castillo's three sessions with the real pipeline.
4. `npm run dev`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Unit tests (transcript parser, pipeline logic, map view models) |
| `npm run seed` | Seed Nora's 3 sessions through the real pipeline (fails if she exists) |
| `npm run reset` | Wipe all data, then seed |

Seeding caches LLM responses in `data/seed-cache/` keyed by model + prompt, so re-seeding with the
same model needs no API calls. Delete the folder to regenerate.

## How it works

- **Pipeline** (`src/lib/server/pipeline/`): extract → merge → reflections, each its own route
  (`/api/sessions/[id]/{extract,merge,reflections}`) called in sequence by the browser. Gemini output
  is validated with zod plus semantic checks and retried once with the errors; transient API errors
  back off and retry. Steps are idempotent, so a failed session resumes from the failed step.
- **Maps** (`src/components/mindmap/`): pure view models in `src/lib/mindmap/` produce frames that a
  single SVG canvas tweens between. Layouts are seeded d3-force runs, so views never reshuffle.
- **Design**: tokens and component classes come from Klarify's saved pages (kept locally in
  `webpages/` and `screens/`, which are git-ignored and must never be committed).
