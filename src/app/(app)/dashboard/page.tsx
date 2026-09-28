import { RecordsView } from "@/components/records/records-view";
import { listClients, listRecentSessions } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { upload, client } = await searchParams;
  const [sessions, clients] = await Promise.all([listRecentSessions(), listClients()]);
  return (
    <RecordsView
      sessions={sessions}
      clients={clients}
      openUpload={upload === "1"}
      uploadClientId={typeof client === "string" ? client : undefined}
    />
  );
}
