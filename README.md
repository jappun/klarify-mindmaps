# Klarify Mindmaps

A working demo of an improved **Mindmap** for Klarify. Everything outside the mindmap flow is out of scope for this demo.

**Live demo:** https://klarify-mindmaps.vercel.app

**Video walkthrough:** [TODO: insert link]

## Try it in two minutes

The demo opens to a sample therapist account (Jane Doe's Clinic). You can explore the existing test client with 3 sessions already processed, or try the full flow yourself:

1. **Clients → Create New**, or go straight to **Record → Upload → Upload text**.
2. Under the text box, open **DEMO: Try with a sample session** and pick **Session 1** of your sample. I've created eight ~8 minute sample sessions from two clients so you can both try out the end-to-end flow. (you'll see _For Moody – Bob_ or _For Bergie – Sam_). The client and session date fill in for you.
3. Processing takes about 15 seconds and lands on the session's map.
4. Upload **Sessions 2–4** the same way, in order.
5. Explore: click a colored node to focus it, click again for details, and press **Esc** to step back out.

## What I saw in the current Mindmap

I ran three sample sessions through Klarify and looked at the resulting map and node details.
<img width="488" height="500" alt="All_3Sessions" src="https://github.com/user-attachments/assets/389f1ada-4deb-4f72-acb3-25234da881ef" />

While this is a great starting point for the feature, I noticed:

1. **Nodes pile up instead of consolidating:** Each session added new nodes and never merged them with earlier ones. This becomes overwhelmingly large. After three sessions the map has around ~50 nodes, some of them the same theme under different names: eg *Leisure and Rest* and *Rest and Respite*,  *I'm becoming my father* and *I could become my father*.
2. **No signals of what matters most:** Every node looks equally important, so frequently occurring themes that come up every session look the same as one-time mentions. This does not convey to the user patterns they might want to explore most deeply with their client.
3. **Can't tell what's new:** Themes from this session and from previous sessions appear identically. Clients are dynamic and changing, so a therapist may want to see at the session-level what themes are new for them.
4. **Supporting quote stands alone:** Modal does not note when the quote is from, or the conversation around it. Without context, I wondered how useful it is since therapists can't possibly remember a single quote's context. 
5. **Reflection questions somewhat disconnected from map:** In the node modal, you cannot add new reflection questions. In the session's reflection question tab, there's no way to link a new question to an existing node. The current list shows each node as a gray subtitle.  
6. **Connections can't be traced:** In the Node modal, connections are a static list. A user can't easily trace from one node to its connections. 

## What I changed

As I explored the mindmaps, I jotted down changes I would make. I used these to draft up a specification (see `SPEC.md`) for Claude Code.

| Problem | Solution |
|---|---|
| Nodes pile up | **LLM merging.** Each new session's themes are matched against the client's existing map, so one theme becomes one node that can appear in many sessions. I do this with a basic prompt Gemini to validate the idea. Merging would work even better with Klarify's existing AI framework.|
| No sense of what matters | **Client-level map opens on the 10 most recurring themes**: the ones that came up in the most sessions. Hover shows which sessions. You can click a node to zoom into it, which will show all its immediate neighbours. |
| Can't tell what's new | **Session-level map separates this session from the past.** Only nodes that appear in this session nodes are full-size and colored. Nodes that are new get a soft yellow halo. Earlier nodes are smaller and grey (hovering shows details). Clicking on a session-level nodes zooms into it and shows its immediate neighbours. |
| Thin node details | **Richer node modal.** Every quote is captioned *Session 2 · Sep 21, 2026 · 4:43*, **Show context** expands the surrounding conversation inline, and "Appears in" links to each session. |
| Reflection questions disconnected from mindmap | **Questions are better linked to nodes.** In the session-level Reflection Questions tab, colour-coding making it obvious which node them they relate to, and clicking the node name opens its modal. Adding a new question requires picking a node. Questions added in the modal and on the Reflection Questions tab stay in sync. |
| Connections are dead text | **Clickable connections** in the node's type color. They open that node in the modal, with a back arrow to retrace your steps. |

The same three sessions that yielded the ~50 node mindmap above shows this as the client-level mindmap in my demo:

## Notes and More 
### Other enhancements
- **Type filter.** Legend entries are checkboxes, so a whole type can be hidden from the current view.
- **Session snapshots.** A session's map only shows what was known as of that session, so looking back at Session 1 isn't cluttered by later themes.
### Future ideas
- **Hindsight mode.** An optional toggle on a past session's map to show how its themes connected to later sessions. Right now session X map has no context of session Y when X<Y.
- **Therapist edits.** Allow therapist to edit the mindmap by hand (rename, merge or split nodes). On an edit, ask for feedback (eg "What did we get wrong?") so we can improve future mindmap creation.
### Demo safeguards
There's no authentication, so everyone shares one workspace. Uploads require confirming no real client data is included, transcripts are capped in size, and uploads and new clients are rate-limited per IP.
