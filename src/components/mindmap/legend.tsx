"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NEW_NODE_HALO, NODE_COLORS, OTHER_SESSION_FILL, OTHER_SESSION_STROKE, TYPE_LABEL_PLURAL } from "@/lib/mindmap/colors";
import { NODE_TYPES, type NodeType } from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mindmap-legend-collapsed";

// Klarify's MindmapLegend markup. With `onToggle`, types become color-filled checkboxes that filter
// the map; the session map also shows the "new this session" halo and the gray "other sessions" swatch.
export function MindmapLegend({
  hidden,
  onToggle,
  showNew = false,
  showOtherSessions = false,
}: {
  hidden?: Set<NodeType>;
  onToggle?: (type: NodeType) => void;
  showNew?: boolean;
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
          const color = NODE_COLORS[type];
          if (!onToggle) {
            return (
              <div key={type} className="flex items-center gap-2">
                <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-klarify-gray-mod-600">{TYPE_LABEL_PLURAL[type]}</span>
              </div>
            );
          }
          const on = !hidden?.has(type);
          return (
            <button
              key={type}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(type)}
              title={on ? "Hide from map" : "Show on map"}
              className="group flex items-center gap-2 text-left"
            >
              <span
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] transition-colors"
                style={{ backgroundColor: on ? color : "#ffffff", borderColor: color }}
              >
                {on && <Check size={10} strokeWidth={3.5} className="text-white" />}
              </span>
              <span className={cn("text-klarify-gray-mod-600 transition-opacity group-hover:text-klarify-gray-mod-800", !on && "opacity-50")}>
                {TYPE_LABEL_PLURAL[type]}
              </span>
            </button>
          );
        })}
        {showNew && (
          <div className="flex items-center gap-2 border-klarify-gray-mod-200 border-t pt-2">
            <div
              className="h-3 w-3 shrink-0 rounded-full bg-white"
              style={{ boxShadow: `0 0 0 2.5px ${NEW_NODE_HALO}, 0 0 5px 2px ${NEW_NODE_HALO}` }}
            />
            <span className="text-klarify-gray-mod-600">New this session</span>
          </div>
        )}
        {showOtherSessions && (
          <div className={cn("flex max-w-40 items-start gap-2", !showNew && "border-klarify-gray-mod-200 border-t pt-2")}>
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
