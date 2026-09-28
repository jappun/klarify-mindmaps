import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UPLOAD_HREF } from "@/lib/config";

// TODO: verify against Klarify — no reference for an empty state; built from the upload modal's header pattern.
export default function NotInDemoPage() {
  return (
    <div className="flex h-full flex-1 items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex items-center justify-center rounded-md border border-klarify-cloud-200 bg-klarify-cloud-100 p-1.5">
          <Upload className="h-6 w-6" />
        </div>
        <h1 className="font-semibold text-2xl text-sidebar-selected">This part of Klarify isn&apos;t in the demo.</h1>
        <p className="text-klarify-neutral-700 text-sm">
          This demo focuses on an improved Mindmap. Try starting here →
        </p>
        <Button asChild className="px-6">
          <Link href={UPLOAD_HREF}>Upload a session</Link>
        </Button>
      </div>
    </div>
  );
}
