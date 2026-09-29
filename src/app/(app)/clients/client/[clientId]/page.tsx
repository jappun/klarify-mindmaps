import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, FileText, FolderOpen, Map, MessageSquare, ShieldCheck, User } from "lucide-react";
import { ClientMindmapTab } from "@/components/clients/client-mindmap-tab";
import { ClientSessionList } from "@/components/clients/client-session-list";
import { RecordSessionMenu } from "@/components/clients/record-session-menu";
import { NOT_IN_DEMO } from "@/lib/config";
import { QuestionsProvider } from "@/lib/client/questions-store";
import { getClient, getClientGraph, listClientSessions } from "@/lib/server/queries";
import { formatShortMonthYear } from "@/lib/format";
import { clientHref, type ClientTab } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS = [
  { label: "Details", icon: User },
  { label: "Sessions", icon: FileText, tab: "sessions" },
  { label: "Chats", icon: MessageSquare },
  { label: "Files", icon: FolderOpen },
  { label: "Treatment Plan", icon: ClipboardList },
  { label: "Mind map", icon: Map, tab: "mindmap" },
  { label: "Diagnosis", icon: ShieldCheck },
] as const;

export default async function ClientPage({ params, searchParams }: PageProps<"/clients/client/[clientId]">) {
  const { clientId } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: ClientTab = rawTab === "sessions" ? "sessions" : "mindmap";

  const client = await getClient(clientId);
  if (!client) notFound();
  const [sessions, graph] = await Promise.all([
    listClientSessions(clientId),
    tab === "mindmap" ? getClientGraph(clientId) : null,
  ]);

  return (
    <div className="flex h-full flex-col px-3 py-2">
      <div className="flex items-center justify-between border-klarify-neutral-200 border-b px-10 pt-7 pb-6">
        <div className="flex items-start gap-8">
          <Link
            href="/clients"
            className="mt-1.5 flex items-center gap-2 text-base text-klarify-neutral-700 hover:text-klarify-neutral-900"
          >
            <ArrowLeft size={16} />
            All clients
          </Link>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="font-medium text-klarify-neutral-900 text-xl">{client.name}</h1>
              <div className="inline-flex items-center justify-center rounded-full border border-border bg-white px-3 py-1 font-normal text-klarify-gray-mod-800 text-xs shadow-xs">
                Individual
              </div>
            </div>
            <div className="flex items-center gap-2 text-klarify-neutral-500 text-xs">
              <span>
                {client.session_count} {client.session_count === 1 ? "session" : "sessions"}
              </span>
              <span className="text-klarify-neutral-300">/</span>
              <span>Since {formatShortMonthYear(client.created_at)}</span>
            </div>
          </div>
        </div>
        <RecordSessionMenu clientId={client.id} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-8 pt-6">
        <nav className="inline-flex h-11 w-fit items-center gap-1 rounded-lg bg-klarify-neutral-100 p-1 text-klarify-neutral-600">
          {TABS.map((t) => {
            const active = "tab" in t && t.tab === tab;
            return (
              <Link
                key={t.label}
                href={"tab" in t ? clientHref(client.id, t.tab) : NOT_IN_DEMO}
                className={cn(
                  "inline-flex h-full items-center gap-2 rounded-md px-4 text-base transition-colors",
                  active ? "bg-white text-klarify-neutral-800 shadow-sm" : "hover:text-klarify-neutral-800",
                )}
              >
                <t.icon size={16} />
                {t.label}
              </Link>
            );
          })}
        </nav>

        {tab === "sessions" ? (
          <ClientSessionList sessions={sessions} clientId={client.id} />
        ) : (
          graph && (
            <QuestionsProvider initial={graph.questions}>
              <ClientMindmapTab graph={graph} />
            </QuestionsProvider>
          )
        )}
      </div>
    </div>
  );
}
