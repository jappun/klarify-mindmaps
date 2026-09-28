"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NODE_COLORS, TYPE_LABEL_PLURAL } from "@/lib/mindmap/colors";
import { NODE_TYPES, type GraphNode } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Required node picker for new/edited questions: this session's nodes, grouped by type with color dots. */
export function NodePicker({
  nodes,
  value,
  onChange,
}: {
  nodes: GraphNode[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const selected = nodes.find((n) => n.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-12 w-64 shrink-0 items-center gap-2 rounded-lg border border-klarify-neutral-300 bg-white px-3 text-left text-sm outline-none transition-colors focus:border-klarify-gray-mod-800 data-[state=open]:border-klarify-gray-mod-800",
            !selected && "text-klarify-neutral-500",
          )}
        >
          {selected ? (
            <>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: NODE_COLORS[selected.type] }} />
              <span className="min-w-0 flex-1 truncate text-klarify-neutral-800">{selected.label}</span>
            </>
          ) : (
            <span className="flex-1">Link to a node…</span>
          )}
          <ChevronDown size={16} className="shrink-0 text-klarify-neutral-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto">
        {NODE_TYPES.map((type) => {
          const ofType = nodes.filter((n) => n.type === type).sort((a, b) => a.label.localeCompare(b.label));
          if (!ofType.length) return null;
          return (
            <div key={type} className="py-1">
              <p className="px-2 pt-1 pb-1 font-medium text-klarify-neutral-500 text-xs">{TYPE_LABEL_PLURAL[type]}</p>
              {ofType.map((n) => (
                <DropdownMenuItem key={n.id} onSelect={() => onChange(n.id)} className={cn(n.id === value && "bg-accent")}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: NODE_COLORS[n.type] }} />
                  <span className="truncate">{n.label}</span>
                </DropdownMenuItem>
              ))}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
