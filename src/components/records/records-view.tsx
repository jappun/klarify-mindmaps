"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  ChevronDown,
  Disc,
  EllipsisVertical,
  ExternalLink,
  FilePen,
  FilePlus,
  Image as ImageIcon,
  Loader2,
  Mic,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/search-input";
import { NOT_IN_DEMO } from "@/lib/config";
import { formatDayHeader, formatNumericDate, formatTime, sessionTitle } from "@/lib/format";
import { sessionHref } from "@/lib/routes";
import type { SessionWithClient } from "@/lib/types";

const RECORD_OPTIONS = [
  { title: "Record virtual session", body: "For web-based platforms like Jane, Owl, and others.", icon: Disc },
  { title: "Record in-person", body: "Best for recording sessions for in-person clients.", icon: Mic },
  { title: "Record a summary", body: "Best for dictating key session notes after a session.", icon: AudioLines },
];

export function RecordsView({
  sessions,
  onUploadText,
}: {
  sessions: SessionWithClient[];
  onUploadText?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? sessions.filter((s) => s.client_name.toLowerCase().includes(q)) : sessions;
    const byDay = new Map<string, SessionWithClient[]>();
    for (const s of filtered) {
      const key = s.session_date;
      byDay.set(key, [...(byDay.get(key) ?? []), s]);
    }
    return [...byDay.entries()];
  }, [sessions, query]);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="flex h-full flex-col gap-8 overflow-y-auto bg-white p-8">
        <div className="flex flex-col items-end gap-4">
          <div className="grid h-fit w-full grid-cols-1 gap-3 lg:gap-4 xl:grid-cols-3 xl:gap-6">
            {RECORD_OPTIONS.map(({ title, body, icon: Icon }) => (
              <Button
                key={title}
                asChild
                variant="outline"
                rounding="lg"
                className="h-full w-full items-start justify-start px-3 py-4 lg:px-4 lg:py-5"
              >
                <Link href={NOT_IN_DEMO}>
                  <div className="flex w-full flex-col items-start gap-1">
                    <div className="flex w-full gap-6 text-left">
                      <div className="flex h-fit items-center justify-center rounded-sm border p-2">
                        <Icon size={16} />
                      </div>
                      <div className="flex flex-1 flex-col items-start justify-center gap-1">
                        <h3 className="font-semibold text-base text-klarify-neutral-950">{title}</h3>
                        <p className="text-pretty text-left text-klarify-neutral-700">{body}</p>
                      </div>
                      <ExternalLink size={24} className="shrink-0 text-klarify-neutral-500" />
                    </div>
                  </div>
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex h-full flex-col space-y-2 overflow-hidden rounded-xl bg-white pt-0 text-klarify-neutral-700">
          <div className="flex min-h-0 w-full flex-none items-end justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                className="max-w-xs"
                placeholder="Search by client name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" className="flex items-center lg:min-w-fit">
                  <Link href={NOT_IN_DEMO}>
                    <span className="flex w-4 shrink-0 justify-center">
                      <FilePlus size={16} />
                    </span>
                    <span className="ml-2">Create empty note</span>
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center lg:min-w-fit">
                      <Upload size={16} />
                      <span className="ml-2">Upload</span>
                      <ChevronDown size={14} className="ml-1 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  {/* TODO: verify against Klarify — menu items inferred from Klarify's i18n strings. */}
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={() => onUploadText?.()}>
                      <FilePen /> Upload text
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push(NOT_IN_DEMO)}>
                      <Upload /> Upload recording
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push(NOT_IN_DEMO)}>
                      <ImageIcon /> Upload image
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="flex h-full min-h-72 flex-1 flex-col">
            <ul className="w-full flex-1 overflow-y-auto">
              {groups.map(([day, rows]) => (
                <div key={day}>
                  <h3 className="flex h-11 items-center rounded-lg bg-klarify-neutral-100 px-5 font-medium text-klarify-neutral-700 text-sm">
                    {formatDayHeader(day)}
                  </h3>
                  {rows.map((s) => (
                    <SessionRow key={s.id} session={s} />
                  ))}
                </div>
              ))}
              {groups.length === 0 && (
                <p className="px-5 py-6 text-klarify-neutral-500 text-sm">No sessions yet.</p>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionRow({ session: s }: { session: SessionWithClient }) {
  const router = useRouter();
  return (
    <li
      onClick={() => router.push(sessionHref(s.id))}
      className="mt-1 grid h-12 cursor-pointer grid-flow-col grid-cols-[min-content_1fr] items-center justify-center gap-2 rounded-lg px-5 text-klarify-neutral-500 text-sm transition-[color] delay-150 duration-1000 hover:bg-klarify-gray-mod-200 lg:gap-6"
    >
      <div className="flex w-32 items-center justify-center gap-1 lg:w-40">
        <span className="mr-2 flex h-6 min-h-6 w-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-klarify-peach-500">
          <FilePen size={12} className="text-klarify-peach-500" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate">{s.client_name}</span>
        </div>
      </div>
      <span className="truncate">{sessionTitle(s.session_number)}</span>
      <div className="flex items-center">
        {/* TODO: verify against Klarify — in-progress/failed row states aren't in the references. */}
        {s.status === "processing" && (
          <span className="flex items-center gap-2 text-nowrap text-klarify-neutral-500">
            <Loader2 size={14} className="animate-spin" /> Processing…
          </span>
        )}
        {s.status === "failed" && <span className="text-nowrap text-klarify-rose-600">Failed</span>}
        <span className="text-klarify-neutral-500 text-sm md:hidden">{formatNumericDate(s.session_date)}</span>
      </div>
      <div className="flex min-w-16 items-center justify-self-start text-left">-</div>
      <span className="hidden lg:block">{formatTime(s.created_at)}</span>
      <div className="flex items-center justify-end gap-4" onClick={(e) => e.stopPropagation()}>
        <Button asChild variant="ghost" className="rounded-full">
          <Link href={NOT_IN_DEMO}>
            <EllipsisVertical size={16} className="justify-self-end text-klarify-neutral-600" />
            <span className="sr-only">Open notes options</span>
          </Link>
        </Button>
      </div>
    </li>
  );
}
