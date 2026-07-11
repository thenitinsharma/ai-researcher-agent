import { Download, BookOpen, FileText } from "lucide-react";
import type { ToolCallResult, ArxivSearchResult } from "@/lib/types";
import { toAbsoluteFileUrl } from "@/lib/api";
import PaperCard from "./PaperCard";

function isArxivResult(output: unknown): output is ArxivSearchResult {
  return !!output && typeof output === "object" && Array.isArray((output as any).entries);
}

function isRenderResult(output: unknown): output is { pdf_url: string; pdf_filename: string } {
  return !!output && typeof output === "object" && typeof (output as any).pdf_url === "string";
}

export default function ToolResultBlock({ result }: { result: ToolCallResult }) {
  // arXiv search — grid of index-card results, same visual language as before,
  // but only rendered because the agent itself decided to search.
  if (result.tool === "arxiv_search" && isArxivResult(result.output)) {
    const papers = result.output.entries;
    return (
      <div className="mt-3 rounded-lg border border-dashed border-line bg-paper/60 p-3">
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-teal-deep">
          <BookOpen size={13} strokeWidth={1.75} />
          arXiv search · {String(result.input.topic ?? "")}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {papers.map((p, i) => (
            <PaperCard key={`${p.title}-${i}`} paper={p} />
          ))}
        </div>
      </div>
    );
  }

  // PDF read — collapsible text preview
  if (result.tool === "read_pdf_from_url") {
    const text = typeof result.output === "string" ? result.output : JSON.stringify(result.output);
    return (
      <div className="mt-3 rounded-lg border border-dashed border-line bg-paper/60 p-3">
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-teal-deep">
          <BookOpen size={13} strokeWidth={1.75} />
          Read PDF · {text.length.toLocaleString()} characters extracted
        </p>
        <details className="text-sm text-inkSoft">
          <summary className="cursor-pointer select-none text-ink">Show extracted text</summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed">
            {text}
          </pre>
        </details>
      </div>
    );
  }

  // Render LaTeX -> PDF — download link
  if (result.tool === "render_latex_to_pdf" && isRenderResult(result.output)) {
    const url = toAbsoluteFileUrl(result.output.pdf_url);
    return (
      <div className="mt-3 rounded-lg border border-dashed border-line bg-paper/60 p-3">
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-teal-deep">
          <FileText size={13} strokeWidth={1.75} />
          Paper rendered
        </p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex w-fit items-center gap-2 rounded-full border border-teal-deep px-3 py-1.5 font-mono text-xs text-teal-deep transition hover:bg-teal-deep hover:text-paper"
        >
          <Download size={13} strokeWidth={1.75} />
          {result.output.pdf_filename}
        </a>
      </div>
    );
  }

  // Fallback for any other/unrecognized tool result
  return (
    <div className="mt-3 rounded-lg border border-dashed border-line bg-paper/60 p-3">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-teal-deep">{result.tool}</p>
      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-xs text-inkSoft">
        {typeof result.output === "string" ? result.output : JSON.stringify(result.output, null, 2)}
      </pre>
    </div>
  );
}
