import type { ArxivPaper } from "@/lib/types";
import { Download } from "lucide-react";

export default function PaperCard({ paper }: { paper: ArxivPaper }) {
  const year = paper.published?.slice(0, 4) ?? "";
  const authorLine =
    paper.authors.length > 2
      ? `${paper.authors[0]} et al.`
      : paper.authors.join(", ") || "Unknown authors";

  return (
    <article className="card-fold flex h-full flex-col justify-between rounded-md border border-line bg-surface p-4 shadow-card">
      <div>
        <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-wide text-inkSoft">
          <span>{year}</span>
          <span className="truncate pl-2 text-right">
            {paper.categories.slice(0, 2).join(" · ")}
          </span>
        </div>
        <h3 className="font-serif text-base font-semibold leading-snug text-ink">
          {paper.title}
        </h3>
        <p className="mt-1 font-mono text-xs text-teal-deep">{authorLine}</p>
        <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-inkSoft">
          {paper.summary}
        </p>
      </div>

      {paper.pdf_link && (
        <div className="mt-4 flex items-center gap-2 border-t border-dashed border-line pt-3">
          <a
            href={paper.pdf_link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-ink px-3 py-1.5 font-mono text-xs text-ink transition hover:bg-ink hover:text-paper"
          >
            <Download size={13} strokeWidth={1.75} />
            PDF
          </a>
        </div>
      )}
    </article>
  );
}
