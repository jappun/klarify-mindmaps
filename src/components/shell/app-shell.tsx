import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

// Klarify's shell: gray frame, 232px sidebar, white rounded content card.
// `fullscreen` hides the sidebar (Klarify's data-dashboard-fullscreen, used on session pages).
export function AppShell({ children, fullscreen = false }: { children: React.ReactNode; fullscreen?: boolean }) {
  return (
    <div
      className={cn(
        "grid h-full w-full bg-klarify-neutral-100 p-4",
        fullscreen ? "grid-cols-[minmax(0,1fr)]" : "grid-cols-[232px_minmax(0,1fr)]",
      )}
    >
      {!fullscreen && <Sidebar />}
      <div className="flex flex-1 flex-col gap-6 overflow-auto rounded-lg border border-klarify-neutral-200 bg-white p-2">
        {children}
      </div>
    </div>
  );
}
