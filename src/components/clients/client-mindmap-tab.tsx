"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UPLOAD_HREF } from "@/lib/config";
import { ClientMindmap } from "@/components/mindmap/client-mindmap";
import { MapHeader } from "@/components/mindmap/map-header";
import { NodeModal } from "@/components/node-modal/node-modal";
import type { ClientGraph } from "@/lib/types";

export function ClientMindmapTab({ graph }: { graph: ClientGraph }) {
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);

  if (graph.nodes.length === 0) {
    return (
      <div className="flex min-h-130 flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-klarify-neutral-500 text-sm">
          No mindmap yet — it appears after this client&apos;s first session is processed.
        </p>
        <Button asChild className="gap-2 px-6">
          <Link href={`${UPLOAD_HREF}&client=${graph.client.id}`}>
            <Upload size={16} /> Upload a session
          </Link>
        </Button>
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
