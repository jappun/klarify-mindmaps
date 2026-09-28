"use client";

import { useState } from "react";
import { ClientMindmap } from "@/components/mindmap/client-mindmap";
import { MapHeader } from "@/components/mindmap/map-header";
import { NodeModal } from "@/components/node-modal/node-modal";
import type { ClientGraph } from "@/lib/types";

export function ClientMindmapTab({ graph }: { graph: ClientGraph }) {
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);

  if (graph.nodes.length === 0) {
    return (
      <div className="flex min-h-130 flex-1 items-center justify-center text-klarify-neutral-500 text-sm">
        No mindmap yet — it appears after this client&apos;s first session is processed.
      </div>
    );
  }

  return (
    <div className="-mx-8 flex min-h-0 flex-1 flex-col">
      <MapHeader title={`${graph.client.name}- Interactive Therapy Mindmap`} />
      <div className="relative min-h-130 flex-1">
        <ClientMindmap graph={graph} onOpenNode={setOpenNodeId} />
      </div>
      <NodeModal graph={graph} nodeId={openNodeId} context={{ kind: "client" }} onClose={() => setOpenNodeId(null)} />
    </div>
  );
}
