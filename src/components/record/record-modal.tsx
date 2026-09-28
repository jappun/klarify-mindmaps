"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FilePen, FileText, Plus, Trash, Upload, X } from "lucide-react";
import { PipelineProgress } from "./pipeline-progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePipeline } from "@/lib/client/use-pipeline";
import { MAX_TRANSCRIPT_CHARS } from "@/lib/config";
import { sessionHref } from "@/lib/routes";
import type { ClientSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const NEW_CLIENT = "__new__";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Upload flow (SPEC §7), built on Klarify's "Upload text" modal: step 1 is the text,
 * step 2 assigns a client; then the processing state.
 */
export function RecordModal({
  open,
  onOpenChange,
  clients,
  defaultClientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientSummary[];
  defaultClientId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent
          className="flex h-150 w-full max-w-250 flex-col border border-klarify-cloud-200 bg-klarify-cloud-50 p-10"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <RecordFlow clients={clients} defaultClientId={defaultClientId} onClose={() => onOpenChange(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function Header({ title, onClose, closeDisabled }: { title: string; onClose: () => void; closeDisabled?: boolean }) {
  return (
    <div className="flex flex-none flex-row items-center justify-start">
      <div className="flex items-center justify-center rounded-md border border-klarify-cloud-200 bg-klarify-cloud-100 p-1.5">
        <FilePen className="h-6 w-6" />
      </div>
      <DialogTitle className="ml-4 font-semibold text-3xl text-sidebar-selected">{title}</DialogTitle>
      <Button
        variant="unstyled"
        rounding="md"
        size="icon"
        disabled={closeDisabled}
        onClick={onClose}
        aria-label="Close"
        className="ml-auto h-auto w-auto border border-klarify-cloud-200 bg-klarify-cloud-100 p-1.5 hover:bg-klarify-gray-mod-200"
      >
        <X />
      </Button>
    </div>
  );
}

function RecordFlow({
  clients,
  defaultClientId,
  onClose,
}: {
  clients: ClientSummary[];
  defaultClientId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"text" | "client">("text");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(
    defaultClientId && clients.some((c) => c.id === defaultClientId) ? defaultClientId : null,
  );
  const [newName, setNewName] = useState("");
  const [date, setDate] = useState(today);
  const [ack, setAck] = useState(false);
  const { state, start, resume } = usePipeline();

  const processing = state.status !== "idle";
  const clientOk = clientId === NEW_CLIENT ? !!newName.trim() : !!clientId;

  const submit = async () => {
    const sessionId = await start({
      transcript: text.trim(),
      ...(clientId === NEW_CLIENT ? { newClientName: newName.trim() } : { clientId: clientId! }),
      sessionDate: date,
      acknowledged: true,
    });
    if (sessionId) router.push(sessionHref(sessionId, "mindmap"));
  };

  const retry = () => {
    if (state.status !== "failed") return;
    if (state.stage === "create" || !state.sessionId) submit();
    else resume(state.sessionId, state.stage).then((ok) => ok && router.push(sessionHref(state.sessionId!, "mindmap")));
  };

  if (processing) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Building the mindmap" onClose={onClose} closeDisabled={state.status === "running"} />
        <div className="mt-10 flex flex-1 flex-col">
          <PipelineProgress
            state={state}
            action={
              <Button onClick={retry} className="shrink-0 px-6">
                Retry
              </Button>
            }
          />
          <div className="flex-1" />
          <p className="text-klarify-neutral-500 text-sm">
            {state.status === "failed" && state.sessionId
              ? "The session is saved. You can retry now, or later from the session page."
              : "This usually takes under a minute. Keep this window open."}
          </p>
        </div>
      </div>
    );
  }

  if (step === "text") {
    return (
      <div className="flex h-full flex-col">
        <Header title="Upload text" onClose={onClose} />
        <div className="mt-6 flex flex-1 flex-col">
          <div className="flex flex-col gap-4">
            <label htmlFor="transcript" className="font-medium text-klarify-neutral-700 text-sm">
              Paste a session transcript, or upload a .txt file. Each line should start like &ldquo;[4:43] Nora:&rdquo;.
            </label>
            {fileName ? (
              <FileCard name={fileName} chars={text.length} onRemove={() => (setFileName(null), setText(""))} />
            ) : (
              <>
                <textarea
                  id="transcript"
                  placeholder="Enter the text content here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={MAX_TRANSCRIPT_CHARS}
                  className="max-h-60 min-h-60 w-full resize-none overflow-y-auto rounded-md border border-klarify-cloud-200 bg-white px-3 py-2 text-sm shadow-sm outline-none placeholder:text-klarify-neutral-500 focus-visible:ring-1 focus-visible:ring-ring"
                />
                <TxtDropzone
                  onText={(name, t) => {
                    setFileName(name);
                    setText(t.slice(0, MAX_TRANSCRIPT_CHARS));
                  }}
                />
              </>
            )}
          </div>
          <div className="flex-1" />
          <div className="mt-6">
            <Button onClick={() => setStep("client")} disabled={!text.trim()} className="w-full">
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Assign a client to build the mindmap" onClose={onClose} />
      <div className="mt-6 flex h-full flex-col">
        <div className="flex items-center gap-3 rounded-md border border-klarify-cloud-200 bg-white p-3">
          <div className="flex h-fit items-center justify-center rounded-sm bg-klarify-cloud-100 p-2">
            <FileText size={18} />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <h3 className="font-medium text-klarify-neutral-700 text-sm">Text is ready for upload</h3>
            <p className="text-klarify-neutral-500 text-sm">{text.trim().length.toLocaleString()} characters</p>
          </div>
          <Button variant="ghost" className="text-sm" onClick={() => setStep("text")}>
            Edit
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_200px] gap-4">
          <Field label="Client">
            <ClientSelect clients={clients} value={clientId} onChange={setClientId} />
          </Field>
          <Field label="Session date">
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value || today())}
              className="h-11 w-full rounded-md border border-klarify-cloud-200 bg-white px-3 text-klarify-neutral-800 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </Field>
        </div>
        {clientId === NEW_CLIENT && (
          <div className="mt-4">
            <Field label="New client name">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                maxLength={120}
                className="h-11 w-full rounded-md border border-klarify-cloud-200 bg-white px-3 text-sm outline-none placeholder:text-klarify-neutral-500 focus-visible:ring-1 focus-visible:ring-ring"
              />
            </Field>
          </div>
        )}

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-md border border-klarify-cloud-200 bg-white p-4">
          <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5" />
          <span className="text-klarify-neutral-700 text-sm">
            I understand this is a demo project and that no real client data should be uploaded.
          </span>
        </label>

        <div className="flex-1" />
        <div className="mt-6 flex w-full gap-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={submit} disabled={!clientOk || !ack} className="flex-1">
            Create Mindmap
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-klarify-neutral-700 text-sm">{label}</span>
      {children}
    </div>
  );
}

// TODO: verify against Klarify — their ClientGroupSelectStep isn't in the saved pages.
function ClientSelect({
  clients,
  value,
  onChange,
}: {
  clients: ClientSummary[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  const selected = clients.find((c) => c.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-md border border-klarify-cloud-200 bg-white px-3 text-left text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring",
            !value && "text-klarify-neutral-500",
          )}
        >
          {value === NEW_CLIENT ? (
            <span className="flex items-center gap-2 text-klarify-neutral-800">
              <Plus size={14} /> New client
            </span>
          ) : selected ? (
            <span className="text-klarify-neutral-800">{selected.name}</span>
          ) : (
            "Select a client"
          )}
          <ChevronDown size={16} className="text-klarify-neutral-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
        {clients.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => onChange(c.id)}>
            {c.name}
            <span className="ml-auto text-klarify-neutral-500 text-xs">
              {c.session_count} {c.session_count === 1 ? "session" : "sessions"}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={() => onChange(NEW_CLIENT)} className="border-klarify-cloud-100 border-t">
          <Plus /> New client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FileCard({ name, chars, onRemove }: { name: string; chars: number; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-klarify-neutral-100 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-klarify-neutral-800 text-sm">{name}</p>
        <span className="text-klarify-neutral-500 text-xs">{chars.toLocaleString()} characters</span>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove file">
        <Trash size={22} className="text-klarify-neutral-500" />
      </Button>
    </div>
  );
}

// Klarify's upload dropzone (dashed border drawn as an SVG background), for .txt files.
function TxtDropzone({ onText }: { onText: (name: string, text: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const read = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.txt$/i.test(file.name) && file.type !== "text/plain") return setError("Please upload a .txt file.");
    if (file.size > MAX_TRANSCRIPT_CHARS * 4) return setError("That file is too large for this demo.");
    setError(null);
    onText(file.name, await file.text());
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
      onDragOver={(e) => (e.preventDefault(), setOver(true))}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        read(e.dataTransfer.files[0]);
      }}
      className={cn("flex w-full cursor-pointer flex-col items-center justify-center py-4", over && "bg-klarify-cloud-100")}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='10' ry='10' stroke='%23C8C8C8FF' stroke-width='2' stroke-dasharray='8' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e\")",
        borderRadius: "10px",
      }}
    >
      <input ref={input} type="file" accept=".txt,text/plain" className="hidden" onChange={(e) => read(e.target.files?.[0])} />
      <Upload className="mb-2 h-6 w-6 text-klarify-neutral-600" />
      <p className="mb-1 text-klarify-neutral-800 text-xs">Click or drag and drop to upload your file</p>
      <span className="text-klarify-neutral-500 text-xs">Text files (.txt)</span>
      {error && <span className="text-klarify-rose-500 text-xs">{error}</span>}
    </div>
  );
}
