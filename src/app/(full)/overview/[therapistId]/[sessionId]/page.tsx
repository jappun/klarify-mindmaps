import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { NOT_IN_DEMO } from "@/lib/config";
import { ReflectionsTab } from "@/components/session/reflections-tab";
import { SessionMindmapTab } from "@/components/session/session-mindmap-tab";
import { QuestionsProvider } from "@/lib/client/questions-store";
import { getClientGraph, getSession } from "@/lib/server/queries";
import { clientHref, sessionHref, type SessionTab } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS: { label: string; tab?: SessionTab }[] = [
  { label: "Notes" },
  { label: "Client" },
  { label: "Treatment Plan" },
  { label: "Transcript" },
  { label: "Session Information" },
  { label: "Mindmap", tab: "mindmap" },
  { label: "Reflection Questions", tab: "reflections" },
];

export default async function SessionPage({ params, searchParams }: PageProps<"/overview/[therapistId]/[sessionId]">) {
  const { sessionId } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: SessionTab = rawTab === "reflections" ? "reflections" : "mindmap";

  const session = await getSession(sessionId);
  if (!session) notFound();
  const graph = session.status === "ready" ? await getClientGraph(session.client_id) : null;

  return (
    <div className="flex h-full flex-col px-10 pt-8">
      <Link
        href={clientHref(session.client_id, "sessions")}
        className="flex w-fit items-center gap-1 text-base text-klarify-neutral-600 hover:text-klarify-neutral-900"
      >
        <ChevronLeft size={18} />
        Back
      </Link>

      <nav className="mt-7 flex items-end gap-2">
        {TABS.map((t) => {
          const active = t.tab === tab;
          return (
            <Link
              key={t.label}
              href={t.tab ? sessionHref(session.id, t.tab) : NOT_IN_DEMO}
              className={cn(
                "border-b-2 px-3 pb-2 text-base transition-colors",
                active
                  ? "border-klarify-gray-mod-700 text-klarify-gray-mod-800"
                  : "border-transparent text-klarify-neutral-600 hover:text-klarify-neutral-900",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="-mx-8 flex min-h-0 flex-1 flex-col pt-8 pb-2">
        {!graph ? (
          <div className="flex flex-1 items-center justify-center text-klarify-neutral-500 text-sm">
            {/* TODO(phase 8): processing / failed states */}
            This session is still processing.
          </div>
        ) : (
          <QuestionsProvider initial={graph.questions}>
            {tab === "mindmap" ? (
              <SessionMindmapTab graph={graph} sessionId={session.id} />
            ) : (
              <ReflectionsTab graph={graph} sessionId={session.id} />
            )}
          </QuestionsProvider>
        )}
      </div>
    </div>
  );
}
