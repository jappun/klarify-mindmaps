"use client";

import { useState } from "react";
import { Download, Loader2, Save, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const notInDemo = () => toast("Not in this demo");

// Header row above the canvas, from klarify-session-mindmap.png. Download works; the rest are inert.
export function MapHeader({ title, onDownload }: { title: string; onDownload?: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    if (!onDownload || busy) return;
    setBusy(true);
    try {
      await onDownload();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't create the image.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center justify-between gap-4 border-klarify-neutral-200 border-b px-6 pb-4">
      <h2 className="min-w-0 truncate text-klarify-neutral-700 text-lg">{title}</h2>
      <div className="flex shrink-0 items-center gap-3 [&>button]:px-4 2xl:[&>button]:px-5">
        <Button variant="outline" className="h-11 gap-2 text-base" onClick={notInDemo}>
          <Save size={18} /> Save Node Positions
        </Button>
        <Button variant="outline" className="h-11 gap-2 text-base" onClick={download} disabled={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Download Image
        </Button>
        <Button
          variant="outline"
          className="h-11 gap-2 border-klarify-rose-100 text-base text-klarify-rose-600 hover:bg-klarify-rose-50"
          onClick={notInDemo}
        >
          <Trash2 size={18} /> Delete Mindmap
        </Button>
        <Button className="h-11 gap-2 text-base" onClick={notInDemo}>
          <Share2 size={18} /> Share
        </Button>
      </div>
    </div>
  );
}
