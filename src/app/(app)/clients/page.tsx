import { ClientsTable } from "@/components/clients/clients-table";
import { listClients } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listClients();
  return <ClientsTable clients={clients} />;
}
