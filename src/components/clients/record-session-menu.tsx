"use client";

import { useRouter } from "next/navigation";
import { AudioLines, ChevronDown, Disc, FilePen, Mic, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NOT_IN_DEMO, UPLOAD_HREF } from "@/lib/config";

export function RecordSessionMenu({ clientId }: { clientId: string }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="floating" className="h-11 gap-2 px-4 text-base">
          <Video size={18} />
          Record a session
          <ChevronDown size={16} />
        </Button>
      </DropdownMenuTrigger>
      {/* TODO: verify against Klarify — menu contents not in references. */}
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => router.push(`${UPLOAD_HREF}&client=${clientId}`)}>
          <FilePen /> Upload text
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push(NOT_IN_DEMO)}>
          <Disc /> Record virtual session
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push(NOT_IN_DEMO)}>
          <Mic /> Record in-person
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push(NOT_IN_DEMO)}>
          <AudioLines /> Record a summary
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
