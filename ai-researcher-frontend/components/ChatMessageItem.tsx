import type { ChatMessage } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="prose prose-sm max-w-none
              prose-headings:font-serif prose-headings:text-ink
              prose-p:text-ink prose-p:leading-relaxed
              prose-strong:text-ink prose-strong:font-semibold
              prose-a:text-teal-deep prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-teal
              prose-li:text-ink prose-li:marker:text-inkSoft
              prose-code:text-rust prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-paperDim prose-pre:text-ink
              prose-blockquote:border-l-teal-soft prose-blockquote:text-inkSoft
              prose-hr:border-line
              prose-table:text-sm prose-th:text-ink prose-th:border-line prose-td:border-line prose-thead:border-line"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Tool results the agent decided to produce this turn — rendered
            inline, never triggered directly by the user. */}
        {message.toolCalls?.map((tc, i) => (
          <ToolResultBlock key={i} result={tc} />
        ))}
      </div>
    </div>
  );
}
