import { RecordsView } from "@/components/records/records-view";
import { listRecentSessions } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessions = await listRecentSessions();
  return <RecordsView sessions={sessions} />;
}
