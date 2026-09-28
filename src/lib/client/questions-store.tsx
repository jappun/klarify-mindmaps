"use client";

// Client-side store for reflection questions, shared by the node modal and the Reflection Questions tab
// so edits in one show up in the other immediately.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ReflectionQuestion } from "../types";

type Store = {
  questions: ReflectionQuestion[];
  add: (input: { sessionId: string; nodeId: string; text: string }) => Promise<boolean>;
  update: (id: string, patch: { text?: string; nodeId?: string }) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
};

const Ctx = createContext<Store | null>(null);

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
  return json as T;
}

export function QuestionsProvider({ initial, children }: { initial: ReflectionQuestion[]; children: React.ReactNode }) {
  const [questions, setQuestions] = useState(initial);

  const add = useCallback<Store["add"]>(async (input) => {
    try {
      const q = await call<ReflectionQuestion>("/api/questions", { method: "POST", body: JSON.stringify(input) });
      setQuestions((qs) => [...qs, q]);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  }, []);

  const update = useCallback<Store["update"]>(async (id, patch) => {
    try {
      const q = await call<ReflectionQuestion>(`/api/questions/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setQuestions((qs) => qs.map((x) => (x.id === id ? q : x)));
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  }, []);

  const remove = useCallback<Store["remove"]>(async (id) => {
    let removed: ReflectionQuestion | undefined;
    setQuestions((qs) => {
      removed = qs.find((x) => x.id === id);
      return qs.filter((x) => x.id !== id);
    });
    try {
      await call(`/api/questions/${id}`, { method: "DELETE" });
      return true;
    } catch (e) {
      if (removed) setQuestions((qs) => [...qs, removed!]);
      toast.error((e as Error).message);
      return false;
    }
  }, []);

  const value = useMemo(() => ({ questions, add, update, remove }), [questions, add, update, remove]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuestions() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQuestions must be used inside QuestionsProvider");
  return ctx;
}
