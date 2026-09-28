"use client";

import { Popover as P } from "radix-ui";
import { cn } from "@/lib/utils";
import { POP_ANIM } from "./dropdown-menu";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;

export function PopoverContent({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        sideOffset={sideOffset}
        className={cn(
          POP_ANIM,
          "z-50 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden",
          className,
        )}
        {...props}
      />
    </P.Portal>
  );
}
