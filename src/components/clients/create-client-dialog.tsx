"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { clientHref } from "@/lib/routes";

// "Create New" on the Clients page. Same header pattern as Klarify's upload modal.
export function CreateClientButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) return void toast.error(json.error ?? "Couldn't create the client.");
    setOpen(false);
    setName("");
    router.push(clientHref(json.id));
  };

  return (
    <>
      <Button className="flex w-36" onClick={() => setOpen(true)}>
        <Plus size={16} />
        <span className="ml-2 text-nowrap">Create New</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent className="flex w-full max-w-lg flex-col gap-0 border border-klarify-cloud-200 bg-klarify-cloud-50 p-8">
            <div className="flex items-center">
              <div className="flex items-center justify-center rounded-md border border-klarify-cloud-200 bg-klarify-cloud-100 p-1.5">
                <UserPlus className="h-6 w-6" />
              </div>
              <DialogTitle className="ml-4 font-semibold text-2xl text-sidebar-selected">Create a client</DialogTitle>
              <Button
                variant="unstyled"
                rounding="md"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="ml-auto h-auto w-auto border border-klarify-cloud-200 bg-klarify-cloud-100 p-1.5 hover:bg-klarify-gray-mod-200"
              >
                <X />
              </Button>
            </div>
            <label className="mt-6 flex flex-col gap-2">
              <span className="font-medium text-klarify-neutral-700 text-sm">Client name</span>
              <input
                autoFocus
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="e.g. John Doe"
                className="h-11 w-full rounded-md border border-klarify-cloud-200 bg-white px-3 text-sm outline-none placeholder:text-klarify-neutral-500 focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
            <p className="mt-2 text-klarify-neutral-500 text-xs">Demo only — please don&apos;t use a real client&apos;s name.</p>
            <div className="mt-8 flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={!name.trim() || busy} onClick={create}>
                {busy ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
