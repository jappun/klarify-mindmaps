"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronDown, Disc, FileText, Info, LogOut, Megaphone, Settings, Sprout, UsersRound } from "lucide-react";
import { NOT_IN_DEMO, THERAPIST } from "@/lib/config";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Record", href: "/dashboard", icon: Disc, match: ["/dashboard"] },
  { label: "Clients", href: "/clients", icon: UsersRound, match: ["/clients"] },
  { label: "Templates", href: NOT_IN_DEMO, icon: FileText, match: [] },
  { label: "Marketing", href: NOT_IN_DEMO, icon: Megaphone, match: [] },
  // TODO: verify against Klarify — Klara AI uses Klarify's plant SVG; kept out of the repo, lucide Sprout stands in.
  { label: "Klara AI", href: NOT_IN_DEMO, icon: Sprout, match: [], iconClass: "text-klarify-forest-600" },
  { label: "Learn Klarify", href: NOT_IN_DEMO, icon: BookOpen, match: [] },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col items-start gap-2 overflow-y-auto">
      <div className="flex h-full w-full flex-col justify-between">
        <div>
          <div className="mb-4 px-1 lg:px-2">
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-custom">
              <Link
                href={NOT_IN_DEMO}
                className="inline-flex h-auto w-full cursor-pointer items-center justify-between gap-3 rounded-t-[inherit] bg-transparent px-3 py-2.5 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full border-0">
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-sm">
                      {THERAPIST.initial}
                    </span>
                  </span>
                  <p className="w-full truncate text-ellipsis">{THERAPIST.clinicName}</p>
                </div>
                <ChevronDown size={16} className="shrink-0 text-klarify-neutral-600" />
              </Link>
              <div className="border-border border-t" />
              <Link
                href={NOT_IN_DEMO}
                className="flex flex-col gap-1.5 rounded-b-[inherit] p-3 text-sm transition-colors hover:bg-black/5 hover:text-foreground"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-klarify-neutral-600">Sessions remaining</span>
                  <span className="font-medium text-foreground">{THERAPIST.sessionsRemaining}</span>
                </div>
              </Link>
            </div>
          </div>
          <ul className="grid items-start px-1 font-medium text-sm lg:px-2">
            {NAV.map(({ label, href, icon: Icon, match, iconClass }) => {
              const active = match.some((m) => pathname.startsWith(m));
              return (
                <Link
                  key={label}
                  href={href}
                  className={cn(
                    "mt-1 flex items-center gap-3 rounded-lg px-2 py-3 transition-all hover:bg-sidebar-hover hover:text-accent-foreground",
                    active ? "bg-sidebar-hover font-medium text-sidebar-selected shadow-sm" : "text-sidebar-muted",
                  )}
                >
                  <span className="shrink-0">
                    <Icon className={cn("h-4 w-4", iconClass)} />
                  </span>
                  <span className="wrap-break-word min-w-0 flex-1 leading-tight">{label}</span>
                </Link>
              );
            })}
          </ul>
        </div>
        <div>
          <div className="px-4">
            <div className="flex h-8 items-center">
              <hr className="w-full border-border" />
            </div>
            <div className="space-y-1 py-3">
              <Link
                href={NOT_IN_DEMO}
                className="group mb-3 flex items-center gap-3 rounded-lg px-3 py-3 text-sidebar-muted transition-all hover:bg-sidebar-hover hover:text-accent-foreground"
              >
                <span className="flex w-full justify-start gap-2 p-0 font-normal text-sidebar-muted text-sm group-hover:text-accent-foreground">
                  <Settings size={20} />
                  Settings
                </span>
              </Link>
              <Link
                href={NOT_IN_DEMO}
                className="flex h-11 w-full items-center justify-start gap-2 rounded-lg px-3 py-2 font-normal text-sidebar-muted text-sm transition-colors hover:bg-sidebar-hover hover:text-accent-foreground"
              >
                <Info size={20} />
                Get Help
              </Link>
              <div className="space-y-1">
                <Link
                  href={NOT_IN_DEMO}
                  className="flex h-11 w-full items-center justify-start gap-2 rounded-lg px-3 py-2 font-normal text-sidebar-muted text-sm transition-colors hover:bg-sidebar-hover hover:text-accent-foreground"
                >
                  <LogOut size={20} />
                  Sign out
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
