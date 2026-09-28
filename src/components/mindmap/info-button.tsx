"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function MindmapInfoButton({ items }: { items: React.ReactNode[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="How this map works"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition-shadow hover:shadow-xl"
        >
          <Info size={20} className="text-klarify-gray-mod-700" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 text-sm">
        <p className="mb-2 font-semibold text-klarify-gray-mod-800">How this map works</p>
        <ul className="list-disc space-y-1.5 pl-4 text-klarify-gray-mod-600">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
