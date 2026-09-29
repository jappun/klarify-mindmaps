# Klarify Mindmaps

A working demo of an improved **Mindmap** for Klarify. It consolidates nodes across sessions, separates what came up in *this* session from everything before it, and improves connections

**Live demo:** https://klarify-mindmaps.vercel.app
**Video walkthrough:** _link coming_

## Try it in two minutes

The demo opens to a sample therapist account (Jane Doe's Clinic).

1. **Clients → Create New**, or go straight to **Record → Upload → Upload text**.
2. Under the text box, open **DEMO: Try with a sample session** and pick **Session 1** of your sample. I've populated the data with ~10 minute sample sessions from two clients so you can both try out the end-to-end flow. (you'll see _For Moody – Bob_ or _For Bergie – Sam_). The client and session date fill in for you.
3. Processing takes about 15 seconds and lands on the session's map.
4. Upload **Sessions 2–4** the same way, in order, and watch themes merge instead of piling up.
5. Explore: click a colored node to focus it, click again for details, and press **Esc** to step back out.

Everything outside the mindmap flow (notes, treatment plans, billing, and so on) is shown so the app looks like Klarify, but routes to a "not in this demo" page.

## Presenting Data Effectively
I recently built out a customer-facing analytics dashboard for a startup I've been doing some contract work with. They build voice AI for restaurants, so their customers are restaurant owners/managers who are extremely busy and often come from non-technical backgrounds. I had to think through
- what information is relevant for them
- how to convey all of that information effectively so they can understand how our product is working for them at-a-glance

That made me think about Klarify's mindmaps. So I signed up for a trial and tried it out myself to see how you take information across sessions and present it to users. 

## What I saw in the current Mindmap

I ran some sample sessions through Klarify and looked at the resulting map and node details:
[insert image]

1. **Nodes pile up instead of consolidating:** Each session adds new nodes and never merges them with earlier ones, so after three sessions the map has around 50 nodes, some of them the same theme under different names: *Time for Rest*, *Rest and Respite* and *Reclaiming Personal Time*; *Affection and Connection*, *Authentic Connection* and *Social Connection*.
2. **Nothing signals what matters:** Every node looks equally important, so the themes that come up every session look the same as one-time mentions.
3. **You can't tell what's new:** Themes from this session and from previous sessions appear identically.
4. **The node details are thin:** One supporting quote with no session, date or timestamp; no way to see what was said around it; connections are plain text.
5. **Reflection questions somewhat disconnected from map:** Each question shows its node as a gray subtitle, and there's no way to link a new question to a node.
6. **Connections can't be traced:**

## What I changed

As I jotted down what changes I would make, I spun up a specification (see `SPEC.md) for Claude Code that you can try out.
[insert image Nora me]

| Problem | Solution |
|---|---|
| Duplicate nodes across sessions | **LLM merging.** Each new session's themes are matched against the client's existing map, so one theme becomes one node that can appear in many sessions. |
| No sense of what matters | **The client map opens on the 10 most recurring themes**: the ones that came up in the most sessions. Hover shows which sessions. |
| Can't tell what's new | **The session map separates this session from the past.** This session's themes are full-size and colored, earlier ones are small and gray (hover to see their type), and themes new this session get a soft yellow halo. |
| Thin node details | **Richer node modal.** Every quote is captioned *Session 2 · Sep 21, 2026 · 4:43*, **Show context** expands the surrounding conversation inline, and "Appears in" links to each session. |
| Connections are dead text | **Clickable connections** in the node's type color. They open that node in the modal, with a back arrow to retrace your steps. |
| Reflection questions float free | **Questions are linked to nodes.** They're color-coded by type, and clicking the node opens it. Adding a question requires picking a node, and questions added in the modal and on the Reflection Questions tab stay in sync. |
[add more info here]

The merge is the core of it. For the sample clients, four sessions produce roughly 45 theme mentions, which consolidate into about 25 nodes, with the most persistent themes appearing in every session.

## Other enhancements

- **Focus zoom.** Click a node to center it with everything it connects to, **from any session**, in full color. Click again for details; **Esc** or the back arrow returns.
- **Stable layouts.** Positions are deterministic, so the map never reshuffles when you focus, filter or come back.
- **Type filter.** Legend entries are checkboxes, so a whole type can be hidden from the current view.
- **Session snapshots.** A session's map only shows what was known as of that session, so looking back at Session 1 isn't cluttered by later themes.
- **Quotes you can trust.** Every quote is checked against the transcript before it's saved. If the model paraphrases, the app falls back to the client's real words, and it never shows a quote it can't trace.
- **Sample sessions and client creation**, so anyone can run the full flow without their own transcripts.
- **Matches Klarify's UI.** Colors, the Switzer font, radii and component styles come from the app's own CSS, and node colors match the existing mindmap.

## How it works

Uploading a session runs three AI steps, each its own server route, called in sequence by the browser so no single request runs long:

1. **Extract:** the transcript is parsed into timestamped utterances, and Gemini pulls out 12–20 candidate nodes (narratives, beliefs, strategies, needs, values), edges between them, a short summary and supporting quotes.
2. **Merge:** candidates are compared with the client's existing nodes (labels, descriptions and recent summaries). Each is either matched to an existing node, adding this session to it, or created as new. Only same-type nodes can match.
3. **Reflect:** Gemini writes 6–8 reflection questions, each linked to one of this session's nodes.

Every model response is requested as structured JSON, validated with zod plus checks like "every edge points at a real node" and "matches keep the same type", and retried once with the errors. Temporary API errors back off and retry. Each step saves its output before the next begins and is safe to re-run, which is what makes **Retry** work.

**The LLM is used only for building the mindmap:** extraction, merging and reflection questions. For the purpose of this demo, it doesn't write notes, summaries or plans.

## Tech stack

- **Next.js 16** (App Router) + TypeScript, **Tailwind CSS v4**, Radix primitives
- **Supabase** Postgres: clients, sessions, nodes, per-session occurrences, edges, reflection questions
- **Gemini** via `@google/genai`, server-side only, with **zod** validation
- **d3-force** for layout, rendered as SVG in React with animated transitions
- **Vitest** for the transcript parser, pipeline logic and map view models
- Deployed on **Vercel**

## Running it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Any current Gemini Flash model |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |

**Database:** run [`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL editor. All database access happens on the server; row-level security is on with no public policies.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Unit tests |
| `npm run seed` / `npm run reset` | Seed (or wipe and re-seed) an example client through the real pipeline |

## Demo safeguards

There's no authentication, so everyone shares one workspace. Uploads require confirming no real client data is included, transcripts are capped in size, and uploads and new clients are rate-limited per IP.

## Future ideas

- **A session timeline in the node modal.** One block per session (summary + quote), showing how a theme evolved over time.
- **Hindsight mode.** An optional toggle on a past session's map to show how its themes connected to later sessions.
- **Tighter within-session dedupe.** The merge consolidates across sessions well, but a single extraction can still produce two close variants of one theme.
- **Therapist edits.** Rename, merge or split nodes by hand, with those corrections guiding future merges.
- **Audio.** Run the same pipeline on Klarify's existing recordings and transcripts.
