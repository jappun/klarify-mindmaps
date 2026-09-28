"use client";

import { useEffect, useRef } from "react";

/**
 * Esc handler for the map. Dialogs/popovers (Radix) call preventDefault() on the Esc they consume,
 * so Esc closes the modal first and only a second Esc reaches the map.
 */
export function useEscape(handler: () => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) ref.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
