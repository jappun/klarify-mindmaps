import { THERAPIST } from "./config";

export type SessionTab = "mindmap" | "reflections";
export type ClientTab = "mindmap" | "sessions";

export const sessionHref = (sessionId: string, tab: SessionTab = "mindmap") =>
  `/overview/${THERAPIST.id}/${sessionId}?tab=${tab}`;

export const clientHref = (clientId: string, tab: ClientTab = "mindmap") => `/clients/client/${clientId}?tab=${tab}`;
