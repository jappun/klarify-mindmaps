"use client";

import { useEffect, useState } from "react";
import { ChevronDown, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NODE_COLORS, OTHER_SESSION_FILL, OTHER_SESSION_STROKE, TYPE_LABEL_PLURAL } from "@/lib/mindmap/colors";
import { NODE_TYPES, type NodeType } from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mindmap-legend-collapsed";

// Klarify's MindmapLegend markup, plus a type filter and an optional gray "other sessions" swatch.
export function MindmapLegend({
  hidden,
  onToggle,
  showOtherSessions = false,
}: {
  hidden?: Set<NodeType>;
  onToggle?: (type: NodeType) => void;
  showOtherSessions?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a per-tab UI preference after hydration
      if (sessionStorage.getItem(STORAGE_KEY) === "true") setCollapsed(true);
    } catch {}
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        sessionStorage.setItem(STORAGE_KEY, String(!c));
      } catch {}
      return !c;
    });

  if (collapsed) {
    return (
      <Button
        onClick={toggle}
        variant="ghost"
        size="icon"
        aria-label="Show legend"
        aria-expanded={false}
        className="rounded-full bg-white/95 shadow-lg backdrop-blur-sm hover:bg-white hover:shadow-xl"
      >
        <List size={20} className="text-klarify-gray-mod-700" />
      </Button>
    );
  }

  return (
    <div className="rounded-lg bg-white/95 shadow-lg backdrop-blur-sm">
      <button
        type="button"
        onClick={toggle}
        aria-expanded
        className="flex w-full items-center justify-between gap-4 border-klarify-gray-mod-200 border-b px-3 py-2 text-left"
      >
        <span className="font-semibold text-klarify-gray-mod-800 text-sm">Legend</span>
        <ChevronDown size={16} className="text-klarify-gray-mod-600" />
      </button>
      <div className="flex flex-col gap-2 p-3 text-xs">
        {NODE_TYPES.map((type) => {
          const off = hidden?.has(type);
          return (
            <button
              key={type}
              type="button"
              disabled={!onToggle}
              onClick={() => onToggle?.(type)}
              title={onToggle ? (off ? "Show" : "Hide") : undefined}
              className={cn("flex items-center gap-2 text-left transition-opacity", off && "opacity-40")}
            >
              <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: NODE_COLORS[type] }} />
              <span className={cn("text-klarify-gray-mod-600", off && "line-through")}>{TYPE_LABEL_PLURAL[type]}</span>
            </button>
          );
        })}
        {showOtherSessions && (
          <div className="flex max-w-40 items-start gap-2 border-klarify-gray-mod-200 border-t pt-2">
            <div
              className="mt-0.5 h-3 w-3 shrink-0 rounded-full border"
              style={{ backgroundColor: OTHER_SESSION_FILL, borderColor: OTHER_SESSION_STROKE }}
            />
            <span className="text-klarify-gray-mod-600">From other sessions — hover to see type</span>
          </div>
        )}
      </div>
    </div>
  );
}
