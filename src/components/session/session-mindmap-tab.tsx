"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MapHeader } from "@/components/mindmap/map-header";
import { SessionMindmap } from "@/components/mindmap/session-mindmap";
import type { ClientGraph } from "@/lib/types";

export function SessionMindmapTab({ graph, sessionId }: { graph: ClientGraph; sessionId: string }) {
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MapHeader title={`${graph.client.name}- Interactive Therapy Mindmap`} />
      <div className="relative min-h-[520px] flex-1">
        <SessionMindmap
          graph={graph}
          sessionId={sessionId}
          modalOpen={!!openNodeId}
          onOpenNode={(id) => {
            // TODO(phase 5): node modal
            setOpenNodeId(null);
            toast(graph.nodes.find((n) => n.id === id)?.label ?? id);
          }}
        />
      </div>
    </div>
  );
}
