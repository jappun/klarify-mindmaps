"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EllipsisVertical, ListFilter } from "lucide-react";
import { CreateClientButton } from "./create-client-dialog";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { NOT_IN_DEMO } from "@/lib/config";
import { formatLastSession, formatMonthYear } from "@/lib/format";
import { clientHref } from "@/lib/routes";
import type { ClientSummary } from "@/lib/types";

const TH = "text-left align-middle font-normal text-klarify-neutral-600 text-sm";
const TD = "py-2 align-middle text-klarify-neutral-500 text-sm";

export function ClientsTable({ clients }: { clients: ClientSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="space-y-2 rounded-lg bg-white p-0 text-klarify-neutral-700">
        <div className="flex w-full flex-row items-center justify-between gap-4 px-4 pt-5 pb-2">
          <div className="flex min-w-0 flex-1 flex-row items-center gap-2">
            <SearchInput
              className="h-8 w-80"
              placeholder="Search clients and groups by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button
              asChild
              variant="unstyled"
              className="h-11 w-fit shrink-0 gap-2 px-3 py-2 font-normal text-klarify-neutral-700 hover:bg-klarify-cloud-100"
            >
              <Link href={NOT_IN_DEMO} aria-label="Filter clients">
                <ListFilter size={16} />
                <span>Filter</span>
              </Link>
            </Button>
          </div>
          <CreateClientButton />
        </div>
        <div className="relative h-[calc(100vh-156px)] overflow-y-auto px-4">
          <table className="w-full caption-bottom text-sm">
            <thead className="h-11 rounded-lg bg-klarify-neutral-100">
              <tr className="h-10 rounded-lg">
                <th className={`${TH} rounded-l-lg pl-3.5`}>Name</th>
                <th className={`${TH} hidden lg:table-cell`}>Client Since</th>
                <th className={TH}>Total Sessions</th>
                <th className={TH}>Last Session</th>
                <th className="text-center align-middle font-normal text-klarify-neutral-600 text-sm">Client Type</th>
                <th className={`${TH} w-12.5 rounded-r-lg`} />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(clientHref(c.id))}
                  className="h-16 cursor-pointer rounded-lg transition-colors hover:bg-muted/50"
                >
                  <td className="rounded-l-lg py-3 pl-3 align-middle text-klarify-neutral-500 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 font-medium">{c.name}</div>
                    </div>
                  </td>
                  <td className={`${TD} hidden lg:table-cell`}>{formatMonthYear(c.created_at)}</td>
                  <td className={TD}>{c.session_count}</td>
                  <td className={TD}>{c.last_session_at ? formatLastSession(c.last_session_at) : "-"}</td>
                  <td className={`${TD} text-center`}>
                    <div className="flex items-center justify-center capitalize">
                      <div className="inline-flex w-20 items-center justify-center whitespace-nowrap text-nowrap rounded-full border border-border bg-klarify-gray-mod-50 px-4 py-1 text-center font-normal text-klarify-gray-mod-800 text-xs">
                        Individual
                      </div>
                    </div>
                  </td>
                  <td className={`${TD} w-12.5 rounded-r-lg pr-3`} onClick={(e) => e.stopPropagation()}>
                    <Button asChild variant="ghost">
                      <Link href={NOT_IN_DEMO} aria-label="Client options">
                        <EllipsisVertical size={16} className="text-klarify-neutral-600" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
