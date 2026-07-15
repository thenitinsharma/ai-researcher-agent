import { FlaskConical } from "lucide-react";
import ApiKeySettings from "./ApiKeySettings";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink bg-surface">
            <FlaskConical size={18} strokeWidth={1.75} className="text-teal-deep" />
          </span>
          <div className="leading-tight">
            <h1 className="font-serif text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              AI Researcher
            </h1>
            <p className="hidden text-xs uppercase tracking-[0.18em] text-inkSoft sm:block">
              Autonomous literature review &amp; paper drafting
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ApiKeySettings />
          <a
            href="https://github.com/thenitinsharma/ai-research-assistant"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-ink px-3 py-1.5 font-mono text-xs text-ink transition hover:bg-ink hover:text-paper sm:px-4 sm:text-sm"
          >
            Source
          </a>
        </div>
      </div>
    </header>
  );
}
