"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { NodeModal } from "@/components/node-modal/node-modal";
import { NodePicker } from "@/components/questions/node-picker";
import { QuestionActions } from "@/components/questions/question-actions";
import { QuestionComposer } from "@/components/questions/question-composer";
import { Button } from "@/components/ui/button";
import { useQuestions } from "@/lib/client/questions-store";
import { NODE_COLORS, TYPE_LABEL } from "@/lib/mindmap/colors";
import type { ClientGraph, GraphNode, ReflectionQuestion } from "@/lib/types";

// Klarify's Reflection Questions tab (klarify reflections tab.png), with color-coded, clickable,
// required node links.
export function ReflectionsTab({ graph, sessionId }: { graph: ClientGraph; sessionId: string }) {
  const { questions, add, update, remove } = useQuestions();
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [newNode, setNewNode] = useState<string | null>(null);

  const nodesById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const sessionNodes = useMemo(
    () => graph.nodes.filter((n) => n.occurrences.some((o) => o.session_id === sessionId)),
    [graph.nodes, sessionId],
  );
  const mine = questions
    .filter((q) => q.session_id === sessionId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="flex min-h-0 flex-1 flex-col px-2">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-klarify-neutral-200">
        <div className="min-h-0 flex-1 overflow-y-auto px-8">
          {mine.map((q) => (
            <QuestionRow
              key={q.id}
              q={q}
              node={nodesById.get(q.node_id)}
              sessionNodes={sessionNodes}
              onOpenNode={setOpenNodeId}
              onSave={(patch) => update(q.id, patch)}
              onDelete={() => remove(q.id)}
            />
          ))}
          {mine.length === 0 && (
            <p className="border-klarify-neutral-200 border-b py-8 text-klarify-neutral-500">No reflection questions yet.</p>
          )}
          <QuestionComposer
            className="py-9"
            canSubmit={!!newNode}
            onSubmit={async (text) => {
              const ok = await add({ sessionId, nodeId: newNode!, text });
              if (ok) setNewNode(null);
              return ok;
            }}
            onCancel={() => setNewNode(null)}
            extra={<NodePicker nodes={sessionNodes} value={newNode} onChange={setNewNode} />}
          />
        </div>
        <div className="flex items-center justify-between gap-4 border-klarify-neutral-200 border-t bg-klarify-gray-mod-50 px-8 py-5">
          <p className="text-base text-klarify-neutral-500">
            Help clients reflect on today&apos;s session. You can edit or delete questions before sharing.
          </p>
          <Button variant="outline" className="h-12 gap-2 bg-white px-6 text-base" onClick={() => toast("Not in this demo")}>
            <Upload size={18} /> Share Questions
          </Button>
        </div>
      </div>

      <NodeModal
        graph={graph}
        nodeId={openNodeId}
        context={{ kind: "session", sessionId }}
        onClose={() => setOpenNodeId(null)}
      />
    </div>
  );
}

function QuestionRow({
  q,
  node,
  sessionNodes,
  onOpenNode,
  onSave,
  onDelete,
}: {
  q: ReflectionQuestion;
  node: GraphNode | undefined;
  sessionNodes: GraphNode[];
  onOpenNode: (id: string) => void;
  onSave: (patch: { text?: string; nodeId?: string }) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editNode, setEditNode] = useState<string | null>(q.node_id);
  // A question can be linked (from the map modal) to a node from an earlier session; keep it pickable.
  const pickable = node && !sessionNodes.some((n) => n.id === node.id) ? [...sessionNodes, node] : sessionNodes;

  if (editing) {
    return (
      <div className="border-klarify-neutral-200 border-b py-5">
        <QuestionComposer
          initialText={q.text}
          submitLabel="Save"
          autoFocus
          canSubmit={!!editNode}
          onSubmit={async (text) => {
            const ok = await onSave({ text, nodeId: editNode ?? undefined });
            if (ok) setEditing(false);
            return ok;
          }}
          onCancel={() => {
            setEditNode(q.node_id);
            setEditing(false);
          }}
          extra={<NodePicker nodes={pickable} value={editNode} onChange={setEditNode} />}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-8 border-klarify-neutral-200 border-b py-5">
      <div className="min-w-0">
        <p className="font-medium text-base text-klarify-neutral-900">{q.text}</p>
        {node && (
          <p className="mt-1 flex items-center gap-2 text-base text-klarify-neutral-500">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: NODE_COLORS[node.type] }} />
            <span>
              {TYPE_LABEL[node.type]} ·{" "}
              <button
                type="button"
                onClick={() => onOpenNode(node.id)}
                className="underline-offset-2 hover:text-klarify-neutral-800 hover:underline"
              >
                {node.label}
              </button>
            </span>
          </p>
        )}
      </div>
      <QuestionActions onEdit={() => setEditing(true)} onDelete={onDelete} />
    </div>
  );
}
