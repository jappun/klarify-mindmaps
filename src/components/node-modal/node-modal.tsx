"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { QuestionActions } from "@/components/questions/question-actions";
import { QuestionComposer } from "@/components/questions/question-composer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useQuestions } from "@/lib/client/questions-store";
import { formatShortDate } from "@/lib/format";
import { NODE_COLORS, TYPE_LABEL } from "@/lib/mindmap/colors";
import { nodeDetails } from "@/lib/mindmap/node-details";
import { sessionHref } from "@/lib/routes";
import type { ClientGraph, Quote, ReflectionQuestion, Session } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ModalContext = { kind: "session"; sessionId: string } | { kind: "client" };

/** Opened by the second click on a node. Remount (via `key`) to start a fresh history. */
export function NodeModal({
  graph,
  nodeId,
  context,
  onClose,
}: {
  graph: ClientGraph;
  nodeId: string | null;
  context: ModalContext;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!nodeId} onOpenChange={(o) => !o && onClose()}>
      {nodeId && (
        // Overlay matches klarify_modal_when_node_clicked.png: dimmed + blurred map behind.
        <DialogContent
          overlayClassName="bg-black/40 backdrop-blur-[3px]"
          className="flex h-[min(640px,90vh)] w-175 max-w-[95vw] flex-col gap-0 rounded-xl p-0"
        >
          <ModalBody key={nodeId} graph={graph} initialId={nodeId} context={context} onClose={onClose} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function ModalBody({
  graph,
  initialId,
  context,
  onClose,
}: {
  graph: ClientGraph;
  initialId: string;
  context: ModalContext;
  onClose: () => void;
}) {
  const [stack, setStack] = useState([initialId]);
  const [tab, setTab] = useState<"details" | "reflections">("details");
  const currentId = stack.at(-1)!;

  const maxN =
    context.kind === "session"
      ? (graph.sessions.find((s) => s.id === context.sessionId)?.session_number ?? Infinity)
      : Infinity;
  const details = useMemo(() => nodeDetails(graph, currentId, maxN), [graph, currentId, maxN]);
  if (!details) return null;
  const { node } = details;

  const go = (id: string) => {
    setStack((s) => [...s, id]);
    setTab("details");
  };
  const back = () => {
    setStack((s) => s.slice(0, -1));
    setTab("details");
  };

  return (
    <>
      <div className="flex items-start gap-3 px-10 pt-8 pb-6">
        {stack.length > 1 && (
          <button
            type="button"
            onClick={back}
            aria-label="Back to previous node"
            className="-ml-6 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-klarify-neutral-600 hover:bg-klarify-cloud-100"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-3 pt-1">
          <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: NODE_COLORS[node.type] }} />
          <DialogTitle className="truncate font-semibold text-klarify-neutral-950 text-xl">{node.label}</DialogTitle>
          <span className="shrink-0 rounded-md bg-klarify-cloud-100 px-2 py-0.5 font-medium text-klarify-neutral-900 text-sm">
            {TYPE_LABEL[node.type]}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-5 pt-1.5 text-sm">
          {(["details", "reflections"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(tab === t ? "font-semibold text-klarify-neutral-950" : "text-klarify-neutral-600 hover:text-klarify-neutral-900")}
            >
              {t === "details" ? "Details" : "Reflections"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mt-2 -mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-klarify-cloud-200 bg-white text-klarify-neutral-700 shadow-sm hover:bg-klarify-gray-mod-50"
        >
          <X size={22} strokeWidth={1.6} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-14 pt-8 pb-10">
        {tab === "details" ? (
          <DetailsTab details={details} context={context} graph={graph} onNavigate={go} />
        ) : (
          <ReflectionsTab graph={graph} nodeId={node.id} context={context} />
        )}
      </div>
    </>
  );
}

// ---------------- Details ----------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h3 className="mb-3 font-medium text-klarify-neutral-950 text-lg">{title}</h3>
      {children}
    </section>
  );
}

function DetailsTab({
  details,
  context,
  graph,
  onNavigate,
}: {
  details: NonNullable<ReturnType<typeof nodeDetails>>;
  context: ModalContext;
  graph: ClientGraph;
  onNavigate: (id: string) => void;
}) {
  const { node, occurrences, connections } = details;
  // Summary: on a session map, this session's (or the latest one we can see); on the client map, every session's.
  const summaries =
    context.kind === "session"
      ? [occurrences.find((o) => o.session_id === context.sessionId) ?? occurrences.at(-1)].filter((o) => !!o)
      : occurrences;
  const multiSession = graph.sessions.length > 1;

  return (
    <>
      {occurrences.length > 0 && (
        <p className="mb-7 text-klarify-neutral-600 text-sm">
          Appears in: {occurrences.length === 1 ? "Session " : "Sessions "}
          {occurrences.map((o, i) => (
            <span key={o.session_id}>
              {i > 0 && ", "}
              <Link
                href={sessionHref(o.session_id)}
                className="font-medium text-klarify-ocean-500 underline-offset-2 hover:underline"
              >
                {o.session.session_number}
              </Link>
            </span>
          ))}
        </p>
      )}

      <Section title={occurrences.flatMap((o) => o.quotes).length === 1 ? "Supporting Quote" : "Supporting Quotes"}>
        <div className="space-y-5">
          {occurrences.flatMap((o) =>
            o.quotes.map((q) => <QuoteBlock key={`${o.session_id}-${q.utterance_index}`} quote={q} session={o.session} />),
          )}
          {occurrences.every((o) => o.quotes.length === 0) && (
            <p className="text-klarify-neutral-500 text-sm">No quote could be traced to the transcript.</p>
          )}
        </div>
      </Section>

      <Section title="Summary">
        {summaries.map((o) => (
          <div key={o.session_id} className="mb-2">
            {summaries.length > 1 && multiSession && (
              <p className="mb-1 font-medium text-klarify-neutral-500 text-xs">
                Session {o.session.session_number} · {formatShortDate(o.session.session_date)}
              </p>
            )}
            <ul className="list-disc space-y-1.5 pl-5 text-base text-klarify-neutral-600">
              {o.summary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Description">
        <p className="text-base text-klarify-neutral-600">{node.description}</p>
      </Section>

      {node.type === "need" && node.need_category && (
        <Section title="Need Category">
          <span className="inline-flex rounded-md border border-klarify-cloud-200 bg-white px-3 py-1 font-semibold text-klarify-neutral-900 text-sm">
            {node.need_category}
          </span>
        </Section>
      )}

      {connections.length > 0 && (
        <Section title="Connections">
          <ul className="list-disc space-y-2.5 pl-5 text-base text-klarify-neutral-600">
            {connections.map((c) => (
              <li key={c.node.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(c.node.id)}
                  className="font-medium underline-offset-2 hover:underline"
                  style={{ color: darken(NODE_COLORS[c.node.type]) }}
                >
                  {c.node.label}
                </button>
                : {c.explanation}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

function QuoteBlock({ quote, session }: { quote: Quote; session: Session }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <blockquote className="border-klarify-neutral-300 border-l-2 pl-5 text-base text-klarify-neutral-600 italic">
        &ldquo;{quote.text}&rdquo;
      </blockquote>
      <div className="mt-1.5 flex items-center gap-3 pl-5 text-klarify-neutral-500 text-xs">
        <span>
          Session {session.session_number} · {formatShortDate(session.session_date)}
          {quote.timestamp_label && ` · ${quote.timestamp_label}`}
        </span>
        {quote.context.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="font-medium text-klarify-ocean-500 underline-offset-2 hover:underline"
          >
            {open ? "Hide context" : "Show context"}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 ml-5 space-y-1 rounded-lg border border-klarify-cloud-200 bg-white p-3">
          {quote.context.map((u) => (
            <div
              key={u.index}
              className={cn("rounded-md px-3 py-2 text-sm", u.index === quote.utterance_index && "bg-klarify-peach-50")}
            >
              <div className="mb-0.5 text-klarify-neutral-500 text-xs">
                [{u.timestamp_label}] <span className="font-medium text-klarify-neutral-700">{u.speaker}</span>
              </div>
              <p className="text-klarify-neutral-700">{u.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Node colors are pastel; darken for readable link text while keeping the hue. */
function darken(hex: string, amount = 0.35) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

// ---------------- Reflections ----------------

function ReflectionsTab({ graph, nodeId, context }: { graph: ClientGraph; nodeId: string; context: ModalContext }) {
  const { questions, add, update, remove } = useQuestions();
  const sessionsById = new Map(graph.sessions.map((s) => [s.id, s]));
  const mine = questions.filter(
    (q) => q.node_id === nodeId && (context.kind === "client" || q.session_id === context.sessionId),
  );
  const latest = graph.sessions.at(-1);
  const [targetSession, setTargetSession] = useState(context.kind === "session" ? context.sessionId : (latest?.id ?? ""));

  // Client map: group by session with headers (newest first).
  const groups =
    context.kind === "client"
      ? [...graph.sessions].reverse().map((s) => ({ session: s, items: mine.filter((q) => q.session_id === s.id) })).filter((g) => g.items.length)
      : [{ session: sessionsById.get(context.sessionId)!, items: mine }];

  return (
    <>
      <h3 className="mb-4 font-medium text-klarify-neutral-950 text-lg">Reflection Questions</h3>
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.session.id}>
            {context.kind === "client" && (
              <p className="mb-2 font-medium text-klarify-neutral-500 text-sm">
                Session {g.session.session_number} · {formatShortDate(g.session.session_date)}
              </p>
            )}
            <div className="space-y-3">
              {g.items.map((q) => (
                <QuestionCard key={q.id} q={q} onSave={(text) => update(q.id, { text })} onDelete={() => remove(q.id)} />
              ))}
            </div>
          </div>
        ))}
        {mine.length === 0 && (
          <p className="text-klarify-neutral-500 text-sm">
            No reflection questions for this node{context.kind === "session" ? " in this session" : ""} yet.
          </p>
        )}
      </div>

      <QuestionComposer
        className="mt-6"
        canSubmit={!!targetSession}
        onSubmit={(text) => add({ sessionId: targetSession, nodeId, text })}
        extra={
          context.kind === "client" && (
            // TODO: verify against Klarify — no select reference; styled to match the input.
            <select
              value={targetSession}
              onChange={(e) => setTargetSession(e.target.value)}
              aria-label="Session"
              className="h-12 shrink-0 rounded-lg border border-klarify-neutral-300 bg-white px-3 text-klarify-neutral-700 text-sm outline-none focus:border-klarify-gray-mod-800"
            >
              {[...graph.sessions].reverse().map((s) => (
                <option key={s.id} value={s.id}>
                  Session {s.session_number}
                </option>
              ))}
            </select>
          )
        }
      />
    </>
  );
}

function QuestionCard({
  q,
  onSave,
  onDelete,
}: {
  q: ReflectionQuestion;
  onSave: (text: string) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <QuestionComposer
        initialText={q.text}
        submitLabel="Save"
        autoFocus
        onSubmit={async (text) => {
          const ok = await onSave(text);
          if (ok) setEditing(false);
          return ok;
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }
  return (
    <div className="flex items-start justify-between gap-6 rounded-xl border border-klarify-cloud-200 bg-white px-6 py-5">
      <p className="text-base text-klarify-neutral-800">{q.text}</p>
      <QuestionActions onEdit={() => setEditing(true)} onDelete={onDelete} />
    </div>
  );
}
