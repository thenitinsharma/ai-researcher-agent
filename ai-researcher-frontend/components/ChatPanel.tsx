"use client";

import { useRef, useState, useEffect } from "react";
import { Send } from "lucide-react";
import { sendChatMessage } from "@/lib/api";
import { getGroqApiKey } from "@/lib/groqKey";
import type { ChatMessage } from "@/lib/types";
import ChatMessageItem from "./ChatMessageItem";
import StatusBadge, { Status } from "./StatusBadge";

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "I'm your research agent. Tell me a field or question you're curious about — physics, ML, quant finance, whatever — and I'll search arXiv, read papers, and eventually draft a new paper, deciding on my own when to use each tool.",
  createdAt: Date.now(),
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

  // One thread per browser session — the backend's MemorySaver checkpointer
  // keeps the full conversation (including tool calls) server-side against
  // this id, so we only ever send the newest message.
  const threadIdRef = useRef<string>(
    typeof crypto !== "undefined" ? crypto.randomUUID() : `thread-${Date.now()}`
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const content = input.trim();
    if (!content) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setStatus("loading");
    try {
      const { reply, toolCalls } = await sendChatMessage(
        content,
        threadIdRef.current,
        getGroqApiKey()
      );
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          toolCalls,
          createdAt: Date.now(),
        },
      ]);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      const detail = err instanceof Error ? err.message : String(err);
      const isRateLimit = /rate_limit_exceeded|tokens per minute|\b413\b/i.test(detail);

      const content = isRateLimit
        ? "⚠️ **This project runs on a shared free-tier Groq API key, which just hit its rate limit.**\n\n" +
          "Please add your own free Groq API key using the **Settings** button (top right) so your " +
          "messages use your own quota instead. You can grab one at [console.groq.com/keys](https://console.groq.com/keys).\n\n" +
          `> Technical details: ${detail}`
        : `I couldn't reach the research backend just now.\n\n**Details:** ${detail}`;

      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content,
          createdAt: Date.now(),
        },
      ]);
    }
  }

  return (
    <section className="flex h-[36rem] flex-col rounded-md border border-line bg-surface sm:h-[42rem]">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
        {messages.map((m) => (
          <ChatMessageItem key={m.id} message={m} />
        ))}
        {status === "loading" && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-line bg-paper px-4 py-2.5">
              <StatusBadge status="loading" label="Thinking — may search, read, or write…" />
            </div>
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-line p-3 sm:p-4"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Ask about a research field or paste a paper idea…"
          className="max-h-32 flex-1 resize-none rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-inkSoft/70 focus:border-teal"
        />
        <button
          type="submit"
          disabled={!input.trim() || status === "loading"}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:bg-teal-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={16} strokeWidth={1.75} />
        </button>
      </form>
    </section>
  );
}
