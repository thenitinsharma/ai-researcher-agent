import type { ChatMessage } from "@/lib/types";
import ToolResultBlock from "./ToolResultBlock";

export default function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[80%] ${
          isUser
            ? "rounded-br-sm bg-ink text-paper"
            : "rounded-bl-sm border border-line bg-surface text-ink"
        }`}
      >
        {!isUser && (
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-teal-deep">
            Research Agent
          </span>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* Tool results the agent decided to produce this turn — rendered
            inline, never triggered directly by the user. */}
        {message.toolCalls?.map((tc, i) => (
          <ToolResultBlock key={i} result={tc} />
        ))}
      </div>
    </div>
  );
}
