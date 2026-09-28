"use client";

import { Dialog as D } from "radix-ui";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;
export const DialogTitle = D.Title;
export const DialogDescription = D.Description;

// Overlay + content classes from Klarify's Dialog primitives.
export function DialogContent({
  className,
  overlayClassName,
  children,
  ...props
}: React.ComponentProps<typeof D.Content> & { overlayClassName?: string }) {
  return (
    <D.Portal>
      <D.Overlay
        className={cn("fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=open]:animate-in", overlayClassName)}
      />
      <D.Content
        aria-describedby={undefined}
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid max-h-screen w-full max-w-[95vw] translate-x-[-50%] translate-y-[-50%] gap-2 rounded-lg bg-klarify-cloud-50 p-3 shadow-lg duration-200",
          className,
        )}
        {...props}
      >
        {children}
      </D.Content>
    </D.Portal>
  );
}
