"use client";

import { Checkbox as C } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Classes verbatim from Klarify's Checkbox.
export function Checkbox({ className, ...props }: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        "peer h-4 w-4 shrink-0 rounded border border-primary shadow focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-klarify-ocean-500 data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <C.Indicator className="flex items-center justify-center text-current">
        <Check className="h-3.5 w-3.5" />
      </C.Indicator>
    </C.Root>
  );
}
