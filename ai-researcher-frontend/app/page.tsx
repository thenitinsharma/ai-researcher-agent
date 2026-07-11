import Header from "@/components/Header";
import ChatPanel from "@/components/ChatPanel";

export default function Home() {
  return (
    <div className="ledger-bg min-h-screen">
      <Header />

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-teal-deep">
            Fields · Physics — Math — CS — Q-Bio — Q-Finance — Stats — EESS — Econ
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            One conversation — the agent decides when to search, read, or write.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-inkSoft">
            There's no separate search box or PDF uploader here on purpose: every
            tool call — arXiv search, PDF extraction, LaTeX rendering — is a
            decision the research agent makes on its own mid-conversation, the
            same way it would run from the command line. Results show up inline
            as they happen.
          </p>
        </div>

        <ChatPanel />

        <footer className="mt-10 border-t border-dashed border-line pt-6 text-xs text-inkSoft">
          <p>
            Backed by a LangGraph agent (StateGraph + ToolNode + bind_tools) over
            Gemini 2.5 Pro, with tools for arXiv search, PDF extraction, and
            Tectonic LaTeX rendering. Conversation memory is kept server-side per
            session via a LangGraph checkpointer.
          </p>
        </footer>
      </main>
    </div>
  );
}
