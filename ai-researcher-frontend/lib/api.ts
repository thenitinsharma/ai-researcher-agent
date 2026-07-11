import type { ToolCallResult } from "./types";

// Point this at your FastAPI backend (StateGraph agent — see backend/main.py).
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** The render_latex_to_pdf tool returns a relative "/files/..." path; this
 * turns it into a fetchable absolute URL against the backend. */
export function toAbsoluteFileUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body || "request failed"}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Sends one new message in an ongoing thread. The backend's LangGraph agent
 * (model.bind_tools + ToolNode) decides on its own whether to call arxiv_search,
 * read_pdf_from_url, or render_latex_to_pdf — the frontend never calls those
 * tools directly. Conversation memory is kept server-side per thread_id via
 * MemorySaver, so only the latest message needs to be sent, not full history.
 */
export function sendChatMessage(
  message: string,
  threadId: string
): Promise<{ reply: string; toolCalls: ToolCallResult[] }> {
  return request<{ reply: string; toolCalls: ToolCallResult[] }>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ thread_id: threadId, message }),
  });
}
