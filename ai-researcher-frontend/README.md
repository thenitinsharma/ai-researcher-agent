# AI Researcher — Frontend

A responsive Next.js 14 (App Router + TypeScript + Tailwind) UI for the AI Researcher
LangGraph agent. There is deliberately **one** screen — a chat — because the agent
(not the user) decides when to search arXiv, read a PDF, or render a paper.
Tool results (paper cards, extracted text, a PDF download link) render inline
inside the chat, right after the turn where the agent chose to use that tool.

| What you see | Where it comes from |
|---|---|
| Chat conversation | `ChatPanel` — the only thing the frontend calls is `POST /api/chat` |
| Paper result cards | `ToolResultBlock`, when a turn's `toolCalls` includes `arxiv_search` |
| Extracted PDF text | `ToolResultBlock`, when a turn's `toolCalls` includes `read_pdf_from_url` |
| PDF download link | `ToolResultBlock`, when a turn's `toolCalls` includes `render_latex_to_pdf` |

## Run it

```bash
npm install
cp .env.local.example .env.local   # point at your backend
npm run dev
```

Opens on http://localhost:3000. Fully responsive from ~360px mobile up through
desktop.

## Backend

The `ai-researcher-backend` package (shipped alongside this frontend) is a real
FastAPI wrapper around your LangGraph agent (`arxiv_tool.py` / `read_pdf.py` /
`write_pdf.py` as its tools) — just run it:

```bash
cd ../ai-researcher-backend
uv sync   # or: pip install -r requirements.txt
cp .env.example .env   # add your GOOGLE_API_KEY
uv run uvicorn main:app --reload --port 8000
```

Then point this frontend at it via `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The frontend calls exactly one route:
```
POST /api/chat  { thread_id, message }  ->  { reply, toolCalls: [{ tool, input, output }] }
```

Conversation memory lives server-side per `thread_id` (a random id generated
once per browser session) via the backend's LangGraph checkpointer, so only
the newest message is sent each turn.

See `ai-researcher-backend/README.md` for the bugs that were fixed in your
original `arxiv_tool.py` / `read_pdf.py` / `write_pdf.py` along the way.

## Design notes

Palette and type were chosen to avoid the generic "cream + terracotta" AI-app look:
a cool paper background (`#F0EFE9`), navy ink text, amber + teal accents, a serif
display face (Source Serif 4) paired with Inter for body copy and IBM Plex Mono for
arXiv IDs, LaTeX, and code. Paper results render as bibliography index cards with a
folded top-right corner, appearing inline in the chat exactly when the agent
decides to search.
