# Klarify Mindmaps Demo: Build Spec

## 0. Git
Git init has already been run. Remote does not yet exist. 

`screens/` and `webpages/` contain Klarify's proprietary UI and must never be committed or pushed. As your first step, add both to `.gitignore` (along with `.env*` and `node_modules/`), then run `git status` to confirm neither folder is tracked. These folders are still available locally. Read them as design references; just never stage them.

## 1. What we're building

A working clone of a small slice of Klarify (an AI assistant for therapists) that shows an improved version of Klarify's **Mindmap** feature. The demo will be recorded on video and shared with Klarify's two founders, who will try it themselves on a Vercel deployment.

The flow a user goes through:

1. The app opens already logged in, on the **Dashboard**.
2. The user clicks **Record**, chooses to upload a transcript, pastes or uploads plain text, picks a client, confirms the privacy checkbox, and submits.
3. The transcript is processed live with the Gemini API: nodes are extracted and **merged into the client's existing mindmap**.
4. The user goes to **Clients**, picks the client, and sees the **client-level mindmap** (narratives-only view) and the client's session list.
5. The user clicks a session and sees the **session-level mindmap**, where the nodes from that session are highlighted against everything from earlier sessions.

The LLM is used **only** for mindmap generation: node extraction, merging, and reflection questions. It does not generate notes, summaries, treatment plans, or anything else.

### The problem this demo solves

Klarify's current mindmap adds new nodes every session and never consolidates them. After three sessions a client can have ~50 nodes with near-duplicates (e.g. "Rest" and "Rest and Restoration", "Recognition" and "Recognition and Being Seen"), and nothing on the map indicates what matters or what's new. This demo fixes that with:

- **LLM merging**, so each theme is one node that can appear across many sessions.
- **A narratives-only client view**, which opens on a small number of top-level nodes that expand on click.
- **A session view that separates this session from the past**, with focus zoom on click.
- **A better node modal**: timestamped quotes, surrounding context, clickable connections, and adding reflection questions.
- **Reflection questions linked to nodes** and color-coded by node type.

---

## 2. Design reference (READ FIRST)

**The UI must match Klarify's existing UI exactly.** Do not invent a new visual style. Every screen, component, color, font, spacing value, border radius, and icon should come from the reference material below. Any new UI element this spec introduces (session tags, gray nodes, back arrow, node picker, checkbox) must reuse existing Klarify patterns from these references.

Reference material lives in two folders at the repo root:

- **`/screens/`**: screenshots of Klarify's app. Filenames describe what each one shows. Use them as the visual reference for layout, components, and styling. Before building any screen, look through this folder for every file that relates to it.
- **`/webpages/`**: Klarify pages saved via Chrome "Save As → Webpage, Complete." **Treat these as the source of truth for design tokens.** Extract exact colors, font families, font sizes, weights, spacing, radii, and shadows from the CSS, and define them once in the Tailwind config / CSS variables. The saved pages may not render correctly when opened; read their CSS and markup rather than relying on how they look. If a screenshot and a saved page disagree on a value, the saved page wins.

If no reference exists for a screen or component, match the visual language of the closest existing references and leave a `// TODO: verify against Klarify` comment.

### 2.1 Node colors (approximate; confirm from `/webpages/`)

| Type | Approx. color |
|---|---|
| Narrative | coral red (~`#F07070`) |
| Belief | teal (~`#4ECDC4`) |
| Strategy | blue (~`#5BB0D0`) |
| Need | sage green (~`#9FCBB4`) |
| Value | yellow (~`#F5CB60`) |
| From other sessions (new) | light gray (derive from Klarify's existing gray tokens) |

---

## 3. Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**, with tokens extracted from `/webpages/`
- **Supabase** (Postgres) for clients, sessions, nodes, edges, and reflection questions
- **Gemini API**, called **only from server-side route handlers**, never from the browser
- **d3-force** for layout, rendered as **SVG in React**, for precise styling and animation control
- **zod** for validating all LLM output
- Deployed on **Vercel**

Environment variables:

```
GEMINI_API_KEY=
GEMINI_MODEL=            # e.g. a current Gemini Flash model; keep configurable
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server only
```

No authentication. The app behaves as if a fake therapist account is logged in (use "Jane Doe" and an avatar initial in the header, matching the avatar style in `/screens/`).

---

## 4. Routes and screens

Mirror Klarify's URL structure where known.

| Route | Screen | In demo? |
|---|---|---|
| `/` | Redirect to `/dashboard` | ✅ |
| `/dashboard` | Dashboard with a working **Record** button | ✅ (only Record works) |
| Record modal (over dashboard) | Upload transcript flow (§7) | ✅ |
| `/clients` | Clients list | ✅ |
| `/clients/client/[clientId]?tab=mindmap` | Client page: header, tabs, session list, **client-level mindmap** (§5) | ✅ |
| `/overview/[therapistId]/[sessionId]?tab=mindmap` | Session page, **Mindmap** tab (§6) | ✅ |
| `/overview/[therapistId]/[sessionId]?tab=reflections` | Session page, **Reflection Questions** tab (§9) | ✅ |
| Everything else | "Not in this demo" page | ➖ |

### 4.1 "Not in this demo" page

All nav items, tabs, and buttons outside the demo flow stay **visible** (so the app looks like Klarify) but route to one shared page, styled in Klarify's UI:

> **This part of Klarify isn't in the demo.**
> This demo focuses on an improved Mindmap. Try starting here → **Upload a session**

"Upload a session" returns to the dashboard with the Record modal open. On the session page this covers the Notes, Client, Treatment Plan, Transcript, and Session Information tabs. Map header buttons (Download, Share, Delete Mindmap) are shown but non-functional (disabled, or a small toast "Not in this demo").

---

## 5. Client-level mindmap (narratives-only view)

Location: client page, Mindmap tab.

### 5.1 Default state
- Show **only Narrative nodes** (typically 4–8 per client).
- Each narrative shows a small count badge of attached nodes (e.g. "12"), styled like Klarify's existing pills.
- Draw a thin edge between two narratives if they share attached nodes.
- Legend: same as Klarify's.

### 5.2 Expanding a narrative
- **First click on a narrative:** animate its cluster open. The narrative moves to the center, its attached nodes (beliefs, strategies, needs, values) appear around it in full color, and other narratives fade to low opacity.
- Only one narrative is expanded at a time.
- **Second click on any node** in the expanded view (including the narrative itself) opens the node modal (§8).
- **Back arrow (top-left of the canvas)** or **Esc** collapses back to the narratives-only view.

### 5.3 Cluster membership
Every non-narrative node has a `primary_narrative_id` (assigned by the LLM, §10). A node appears in its primary narrative's cluster. If it's also connected to other narratives, those edges are drawn when either cluster is expanded.

---

## 6. Session-level mindmap

Location: session page, Mindmap tab.

### 6.1 Which nodes appear
All of the client's nodes that appeared in **this session or any earlier session**. Nodes that first appear in later sessions are hidden, so viewing Session 2 never shows Session 3 themes.

### 6.2 Default state
- **Nodes that appear in this session:** full size, full type color.
- **Nodes only from other sessions:** smaller (~60% diameter) and gray. On hover, a gray node shows its type color and a tooltip with its label and the sessions it appeared in (e.g. "Sessions 1, 2").
- *(Nice to have)* A small **"New"** marker on nodes whose first appearance is this session.
- **Legend:** the five types plus one gray swatch: **"From other sessions — hover to see type."** Clicking a type in the legend toggles that type's visibility (filter).

### 6.3 Focus zoom
- **First click on a this-session (colored) node:** animate to a focused view. The clicked node is centered, and every node directly connected to it, **from any session**, is arranged around it **in full type color**. All other nodes are hidden or faded to near-invisible.
- In focused view, a small session tag under each related node (e.g. "S1", or "Session 1") shows where it came from.
- **Second click on any node** in the focused view (center or related) opens the node modal (§8).
- **Back arrow (top-left of the canvas)** or **Esc** returns to the default session view.
- Gray nodes in the default view respond to hover only, not click.

### 6.4 Layout stability
Positions must be stable. Compute layouts deterministically (seeded) and cache node positions per view so switching between default, focused, and back does not reshuffle the map. Animate transitions (~300–400 ms, ease-in-out).

### 6.5 Info button
The existing ⓘ button (bottom-left) opens a short help popover explaining the interactions: colored vs. gray nodes, click to focus, click again for details, Esc/back to return.

---

## 7. Upload flow

Triggered by **Record** on the dashboard. Match Klarify's Record UI from the references in `/screens/` and `/webpages/`.

Fields:
1. **Transcript:** a textarea for pasting plain text, or a `.txt` file upload.
2. **Client:** dropdown of existing clients, plus a "+ New client" option that reveals a name input.
3. **Session date:** date picker, default today.
4. **Required checkbox:** "I understand this is a demo project and that no real client data should be uploaded." The Submit button is disabled until it's checked.

On submit:
- Create the session with status `processing` and show Klarify's processing state (see `/screens/`), with step labels: "Reading transcript…", "Finding themes…", "Merging with previous sessions…", "Writing reflection questions…".
- Run the pipeline (§10).
- On success, navigate to the new session's Mindmap tab.
- On failure, show an error in Klarify's style with a **Retry** button. The session stays in `failed` status and can be retried.

---

## 8. Node modal

Opened by the second click on a node in either map. Keep Klarify's existing modal layout (see `/screens/`) with these changes.

### 8.1 Header
Colored dot + title + type pill + **Details / Reflections** tabs + close ✕ (unchanged). Add a small back arrow at the top-left of the modal, visible only when the user has navigated between nodes (see 8.3).

### 8.2 Details tab
- **Appears in:** a line listing the sessions, e.g. "Sessions 1, 2, 3", each a link to that session's Mindmap tab.
- **Supporting Quotes:** one or more quotes (at least one per session the node appeared in). Each quote keeps Klarify's left-bordered italic style and adds a caption: **"Session 2 · Sep 21, 2026 · 4:43"**. Below each quote, a **"Show context"** link expands the surrounding conversation inline: the 3 utterances before and after, with speaker labels and timestamps, and the quoted utterance highlighted. The link toggles to "Hide context."
- **Summary, Description, Need Category (needs only):** unchanged.
- **Connections:** same bullet format (**Node name**: explanation), but each node name is a **clickable link** styled in its type color. Clicking it replaces the modal content with that node's details.

### 8.3 Modal navigation history
Moving between nodes via connections pushes onto a history stack. The modal back arrow pops it. Esc closes the modal entirely (it does not also exit the map's focus view; a second Esc does that).

### 8.4 Reflections tab
- Lists the reflection questions linked to this node, in Klarify's bordered-card style. On the session map: questions for this session. On the client map: all questions for this node, grouped by session with session headers.
- Each question has edit (pencil) and delete (trash) icons, matching the Reflections tab.
- **New:** an input "Enter a new reflection question…" with **Add** and **Cancel**, styled exactly like the Reflections tab input. A question added here is automatically linked to this node and to the current session. On the client map, add a small session dropdown defaulting to the most recent session.

---

## 9. Reflection Questions tab (session page)

Keep Klarify's existing layout (see `/screens/`) with these changes:

- **Color coding:** replace the gray subtitle text ("Belief: My Life Matters Less") with a small dot in the node's type color, followed by "Belief · My Life Matters Less."
- **Clickable node:** the node label in the subtitle opens that node's modal (Details tab) over the page.
- **Linking new questions:** next to the "Enter a new reflection question…" input, add a **node picker** dropdown, required before **Add** is enabled. It lists this session's nodes grouped by type, each with its color dot.
- **Editing:** the pencil icon lets the user change both the text and the linked node.
- **Share Questions:** visible but not functional (toast "Not in this demo").

Questions added here and in the node modal are the same records and stay in sync.

---

## 10. LLM pipeline (Gemini)

All calls run server-side in Next.js route handlers. Use Gemini's structured output (JSON response schema) and validate every response with zod. On a validation failure, retry once with the validation error appended to the prompt, then fail the step.

### 10.1 Transcript parsing (no LLM)
Parse the transcript into utterances. The expected format is a header block, then a line of `=`, then repeated:

```
[m:ss] Speaker Name:
Utterance text (may span lines)
```

Each utterance gets `index`, `timestamp` (seconds), `timestamp_label` ("4:43"), `speaker`, and `text`. Be tolerant of header differences (some transcripts have no "Therapist:" line) and of `[h:mm:ss]` timestamps. Store the utterances on the session.

### 10.2 Step A: Extract (per session)
Input: the utterances, each prefixed with its index, e.g. `[#37 4:43] Nora: ...`.
Output: candidate nodes and edges for this session only.

Each candidate node:
- `temp_id`
- `type`: `narrative | belief | strategy | need | value`
- `label`: 1–5 words, Title Case, in Klarify's style ("The Dutiful Daughter", "Expressing Anger Makes Things Worse", "Numbing with Wine")
- `description`: one short fragment, like Klarify's ("Need to be asked, consulted, valued as person with own life")
- `summary`: 1–3 short bullets about how it showed up **in this session**
- `need_category`: needs only (e.g. Identity, Connection, Safety, Autonomy, Rest)
- `quote_utterance_indices`: 1–2 indices of **client** utterances supporting the node
- `quote_text`: the exact short excerpt (≤ 20 words) from that utterance

Each candidate edge: `source_temp_id`, `target_temp_id`, `explanation` (one short sentence).

Type definitions to include in the prompt:
- **Narrative:** an overarching story the client lives by or tells about themselves.
- **Belief:** a rule or assumption the client holds (often implicit).
- **Strategy:** a coping behavior or pattern, adaptive or not.
- **Need:** something the client lacks or longs for.
- **Value:** something the client cares about or is guided by.

Guidance: prefer fewer, meaningful nodes (roughly 12–20 per session). Every non-narrative node must connect to at least one narrative.

**Quote verification:** after extraction, check in code that each `quote_text` appears (case- and whitespace-insensitive) in the referenced utterance. If it doesn't, fall back to the first ~20 words of that utterance. Never display a quote that can't be traced to an utterance.

### 10.3 Step B: Merge (against the client's existing graph)
Input: the client's existing nodes (`id`, `type`, `label`, `description`) and the candidates from Step A.
Output, for each candidate: either `{ "action": "match", "existing_id": "..." }` or `{ "action": "new" }`, and for every non-narrative node (matched or new), a `primary_narrative_id` (existing id or candidate temp_id).

Prompt guidance: match when two nodes describe the **same underlying theme**, even with different wording ("Rest" vs. "Rest and Restoration", "Recognition" vs. "Recognition and Being Seen"). Only match nodes of the same type. When in doubt, match. Fragmentation is the problem this demo solves.

Apply in code:
- **Match:** add a `node_occurrence` for this session (summary + quotes) to the existing node. Keep the existing label and description.
- **New:** create the node, with `first_session_id` set to this session.
- **Edges:** remap temp ids to real ids. If the edge already exists, add this session to its `session_ids`; otherwise create it.

For a client's first session there are no existing nodes, so skip the LLM call and treat every candidate as new. For narratives, pick a primary narrative only for non-narrative nodes.

### 10.4 Step C: Reflection questions
Input: this session's nodes (after merge) with their summaries.
Output: 6–8 reflection questions, each with a `node_id`. Match the tone of Klarify's examples: open, gentle, second person, one sentence ("Who in your life has truly asked what you wanted before assuming your answer?").

### 10.5 Timeouts
Split the pipeline into separate route handlers (`/api/sessions/[id]/extract`, `/merge`, `/reflections`). The client calls them in sequence and updates the processing step labels between them. Set `maxDuration` on each route and check Vercel's current limits for the plan in use. Each step saves its output before the next starts, so a retry resumes from the failed step.

---

## 11. Data model (Supabase)

```sql
clients (
  id uuid pk, name text, created_at timestamptz
)

sessions (
  id uuid pk, client_id uuid fk, session_number int, session_date date,
  status text check (status in ('processing','ready','failed')),
  failed_step text null,
  raw_transcript text,
  utterances jsonb,          -- [{index, timestamp, timestamp_label, speaker, text}]
  extraction jsonb null,     -- Step A output, saved for resume/debug
  created_at timestamptz
)

nodes (
  id uuid pk, client_id uuid fk,
  type text check (type in ('narrative','belief','strategy','need','value')),
  label text, description text, need_category text null,
  primary_narrative_id uuid null fk -> nodes.id,
  first_session_id uuid fk -> sessions.id,
  created_at timestamptz
)

node_occurrences (
  id uuid pk, node_id uuid fk, session_id uuid fk,
  summary text[],
  quotes jsonb               -- [{utterance_index, text}]
)

edges (
  id uuid pk, client_id uuid fk,
  source_node_id uuid fk, target_node_id uuid fk,
  explanation text,
  session_ids uuid[]
)

reflection_questions (
  id uuid pk, session_id uuid fk, node_id uuid fk,
  text text, source text check (source in ('ai','therapist')),
  created_at timestamptz
)
```

A node "appears in" a session if it has a `node_occurrence` for that session.

---

## 12. Seed data

Seed one client, **Nora Castillo**, with three sessions from the transcripts in `/transcripts/`:

- `nora_session_1.txt` (Sep 14, 2026)
- `nora_session_2.txt` (Sep 21, 2026)
- `nora_session_3.txt` (Sep 28, 2026)

Seeding runs the **real pipeline** (§10) over the three transcripts in order via a script (`npm run seed`), so the seeded map is exactly what the live upload produces. Also add `npm run reset`, which wipes all data and re-seeds. Optionally cache the seed's LLM outputs to `/data/seed-cache/` so re-seeding doesn't need API calls.

During the live demo, a fourth session can be uploaded for Nora (or a new client created) through the Record flow.

---

## 13. Out of scope

- Authentication, multi-user support, per-visitor data isolation
- Notes, treatment plans, summaries, transcript tab, session information, billing, claims, or any other Klarify feature
- Audio recording or speech-to-text (text upload only)
- Mindmap PNG download, sharing, deleting
- Node sizing by frequency or connection count
- Editing nodes or edges by hand

---

## 14. Build order

1. **Scaffold and design tokens.** Next.js + Tailwind. Extract tokens from `/webpages/`. Build the app shell (sidebar, header, page card), dashboard, clients list, client page, session page with tabs, and the "Not in this demo" page, all static.
2. **Data layer.** Supabase schema, typed queries, transcript parser with unit tests on the three Nora transcripts.
3. **Pipeline.** Steps A–C, zod schemas, quote verification, seed and reset scripts. Check that the seeded Nora map has clearly fewer nodes than one-node-per-mention and no obvious duplicates.
4. **Session mindmap.** Layout, colored vs. gray, hover, legend with gray swatch and type filter, focus zoom, back arrow + Esc.
5. **Node modal.** Timestamped quotes, show context, clickable connections with history, reflections with add/edit/delete.
6. **Client mindmap.** Narratives-only view, count badges, expand/collapse.
7. **Reflection Questions tab.** Color coding, clickable node labels, node picker, sync with the modal.
8. **Upload flow.** Record modal, required checkbox, processing states, error + retry.
9. **Deploy** to Vercel with environment variables. Run through §15 on the deployed URL.

---

## 15. Acceptance checklist (demo script)

- [ ] App opens on the dashboard with no login.
- [ ] Record → paste transcript → pick Nora → Submit is disabled until the checkbox is checked.
- [ ] Processing shows step labels and lands on the new session's Mindmap tab.
- [ ] Nodes that already existed (e.g. from Sessions 1–3) are matched, not duplicated; the new session's nodes are colored and older ones are gray.
- [ ] Hovering a gray node shows its type color, label, and sessions.
- [ ] Clicking a colored node zooms to it with related nodes from all sessions in full color and session tags; back arrow and Esc both return.
- [ ] Second click opens the modal. Quotes show session, date, and timestamp; "Show context" expands the surrounding conversation.
- [ ] Clicking a connection navigates to that node inside the modal; the modal back arrow returns.
- [ ] Adding a reflection question in the modal shows up in the Reflection Questions tab, color-coded and linked to the node.
- [ ] Adding a question in the Reflection Questions tab requires picking a node.
- [ ] Client page Mindmap tab shows only narratives with count badges; clicking one expands its cluster; Esc collapses.
- [ ] Every out-of-scope nav item or tab leads to the "Not in this demo" page with a working link to the upload.
- [ ] Every screen visually matches the references in `/screens/` and `/webpages/`.