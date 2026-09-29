"use client";

import { useRef, useState } from "react";
import { MapHeader } from "@/components/mindmap/map-header";
import { SessionMindmap } from "@/components/mindmap/session-mindmap";
import { NodeModal } from "@/components/node-modal/node-modal";
import type { ClientGraph } from "@/lib/types";

export function SessionMindmapTab({ graph, sessionId }: { graph: ClientGraph; sessionId: string }) {
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const downloadRef = useRef<(() => Promise<void>) | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MapHeader
        title={`${graph.client.name}- Interactive Therapy Mindmap`}
        onDownload={async () => downloadRef.current?.()}
      />
      <div className="relative min-h-130 flex-1">
        <SessionMindmap graph={graph} sessionId={sessionId} onOpenNode={setOpenNodeId} downloadRef={downloadRef} />
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
