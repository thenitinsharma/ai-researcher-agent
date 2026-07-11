// Mirrors the dict shape returned by arxiv_tool.py -> parse_arxiv_xml()
export interface ArxivPaper {
  title: string;
  summary: string;
  authors: string[];
  published: string;
  pdf_link: string | null;
  categories: string[];
}

export interface ArxivSearchResult {
  entries: ArxivPaper[];
}

/** One tool invocation the agent made during a turn, and its result. */
export interface ToolCallResult {
  tool: "arxiv_search" | "read_pdf_from_url" | "render_latex_to_pdf" | string;
  input: Record<string, unknown>;
  output: unknown;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCallResult[];
  createdAt: number;
}

