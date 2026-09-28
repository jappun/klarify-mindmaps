import Link from "next/link";
import { EllipsisVertical, FilePen, Loader2 } from "lucide-react";
import { NOT_IN_DEMO } from "@/lib/config";
import { formatDayHeader, sessionTitle } from "@/lib/format";
import { sessionHref } from "@/lib/routes";
import type { Session } from "@/lib/types";

// Client page → Sessions tab. Same date-group header + row pattern as the Records page.
export function ClientSessionList({ sessions }: { sessions: Session[] }) {
  const byDay = new Map<string, Session[]>();
  for (const s of sessions) byDay.set(s.session_date, [...(byDay.get(s.session_date) ?? []), s]);

  return (
    <ul className="w-full">
      {[...byDay.entries()].map(([day, rows]) => (
        <div key={day} className="mb-2">
          <h3 className="flex h-14 items-center rounded-lg bg-klarify-neutral-100 px-7 font-medium text-klarify-neutral-800 text-sm">
            {formatDayHeader(day)}
          </h3>
          {rows.map((s) => (
            <li key={s.id} className="relative">
              <Link
                href={sessionHref(s.id)}
                className="mt-1 grid h-12 grid-cols-[min-content_1fr_auto_auto] items-center gap-6 rounded-lg px-7 text-klarify-neutral-500 text-sm hover:bg-klarify-gray-mod-200"
              >
                <span className="mr-6 flex h-6 min-h-6 w-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-klarify-peach-500">
                  <FilePen size={12} className="text-klarify-peach-500" />
                </span>
                <span className="flex items-center gap-3 truncate text-base text-klarify-neutral-600">
                  {sessionTitle(s.session_number)}
                  {s.status === "processing" && (
                    <span className="flex items-center gap-1.5 text-klarify-neutral-500 text-sm">
                      <Loader2 size={14} className="animate-spin" /> Processing…
                    </span>
                  )}
                  {s.status === "failed" && <span className="text-klarify-rose-600 text-sm">Failed</span>}
                </span>
                <span className="w-32 text-right">-</span>
                <span className="w-12" />
              </Link>
              <Link
                href={NOT_IN_DEMO}
                aria-label="Session options"
                className="absolute top-1/2 right-5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full hover:bg-accent"
              >
                <EllipsisVertical size={16} className="text-klarify-neutral-600" />
              </Link>
            </li>
          ))}
        </div>
      ))}
    </ul>
  );
}
