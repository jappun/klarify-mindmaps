import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { NOT_IN_DEMO } from "@/lib/config";
import { getSession } from "@/lib/server/queries";
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

      <div className="flex min-h-0 flex-1 flex-col pt-8">
        {tab === "mindmap" ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed text-klarify-neutral-500 text-sm">
            Session mindmap — build step 4
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed text-klarify-neutral-500 text-sm">
            Reflection questions — build step 7
          </div>
        )}
      </div>
    </div>
  );
}
