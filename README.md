# AI Researcher

An autonomous research agent with a chat interface: tell it a field or topic,
and it searches arXiv, reads papers, discusses future research directions,
and drafts a full LaTeX-rendered paper — all as tool calls the agent decides
to make on its own. There's no manual "search" or "generate PDF" button; the
model chooses when to use each tool as the conversation unfolds.

**Live app:** add your deployed Vercel/Render URLs here once live.

```
You: write me a research paper on prompt engineering, check latest papers
Agent: [searches arXiv] Here are 5 recent papers on prompt engineering...
You: let's go with the benchmarking one
Agent: [reads the PDF] Here's what it covers, and some future directions...
You: draft the paper on direction #2
Agent: [writes LaTeX, renders it] Here's your paper: <PDF link>
```

---

## Architecture

Two independent deployables:

```
ai-researcher-frontend/   Next.js 14 (App Router + TypeScript + Tailwind)
ai-researcher-backend/    FastAPI + LangGraph agent (Python)
```

```
Browser
  │  POST /api/chat  { thread_id, message, groq_api_key? }
  ▼
FastAPI  ──►  LangGraph StateGraph
                 │
              ┌──┴──┐
              │agent│  ChatGroq (openai/gpt-oss-120b) . bind_tools([...])
              └──┬──┘
                 │ tool_calls present?
              ┌──┴──┐
              │tools│  ToolNode: arxiv_search · read_pdf_from_url · render_latex_to_pdf
              └──┬──┘
                 │
                 └──► loop back to agent until no more tool_calls
                            │
                            ▼
                  { reply, toolCalls: [...] }
```

- **The model decides which tool to call and when.** There is no direct REST
  route for `arxiv_search`, `read_pdf_from_url`, or `render_latex_to_pdf` — the
  frontend only ever talks to `POST /api/chat`.
- **Conversation memory lives server-side**, per `thread_id`, via LangGraph's
  `MemorySaver` checkpointer — the frontend only sends the newest message each
  turn, not the full history.
- **Tool results render inline in the chat** (paper cards, extracted PDF text,
  a PDF download link) right after the turn where the agent chose to use that
  tool — see `ToolResultBlock` in the frontend.

## Tech stack

| | |
|---|---|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, `react-markdown` + `remark-gfm` for rendering agent replies |
| **Backend** | FastAPI, LangGraph (`StateGraph` + `ToolNode` + `MemorySaver`), LangChain |
| **Model** | Groq — `openai/gpt-oss-120b` via `langchain-groq` |
| **Tools** | arXiv API search, PyPDF2 for PDF text extraction, Tectonic for LaTeX → PDF rendering |

## Project structure

```
ai-researcher-backend/
  main.py            FastAPI app, LangGraph agent wiring, /api/chat route
  arxiv_tool.py       arxiv_search tool — queries the arXiv API
  read_pdf.py         read_pdf_from_url tool — downloads + extracts PDF text
  write_pdf.py        render_latex_to_pdf tool — compiles LaTeX via Tectonic
  requirements.txt / pyproject.toml
  Dockerfile          includes Tectonic binary for LaTeX rendering
  render.yaml         Render blueprint for one-click deploy

ai-researcher-frontend/
  app/                Next.js App Router pages
  components/
    ChatPanel.tsx       chat state, sends messages, shows errors
    ChatMessageItem.tsx renders each message (Markdown for assistant replies)
    ToolResultBlock.tsx renders paper cards / PDF text / PDF links inline
    ApiKeySettings.tsx  popover for a visitor's own Groq API key
    Header.tsx
  lib/
    api.ts              the one function that calls POST /api/chat
    groqKey.ts           localStorage helper for a personal Groq API key
    types.ts
```

## Running locally

**Backend:**
```bash
cd ai-researcher-backend
pip install -r requirements.txt   # or: uv sync
cp .env.example .env              # set GROQ_API_KEY
uvicorn main:app --reload --port 8000
```
You'll also need [Tectonic](https://tectonic-typesetting.github.io/) installed
and on `PATH` for `render_latex_to_pdf` to work locally (the Docker image
already includes it).

**Frontend:**
```bash
cd ai-researcher-frontend
npm install
cp .env.local.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```
Opens on http://localhost:3000.

## Environment variables

| Where | Variable | Purpose |
|---|---|---|
| Backend | `GROQ_API_KEY` | Server's shared Groq key. Get one at [console.groq.com/keys](https://console.groq.com/keys) |
| Backend | `FRONTEND_URL` | Your deployed frontend origin, for CORS |
| Frontend | `NEXT_PUBLIC_API_URL` | Your deployed backend URL |

## Bring your own Groq API key

This project defaults to a single shared `GROQ_API_KEY` on the server, which
is subject to Groq's free-tier rate limit (tokens-per-minute cap). If you hit
a rate-limit error in the chat, click **Settings** (top right) and paste in
your own free key from [console.groq.com/keys](https://console.groq.com/keys).
It's stored only in your browser's `localStorage` and sent directly to this
app's own backend with each message — never anywhere else. Each key gets its
own model client server-side, but all keys share the same conversation memory
per `thread_id`, so switching keys mid-conversation doesn't lose context.

## API

- `POST /api/chat` — `{ thread_id, message, groq_api_key? }` → `{ reply, toolCalls }`.
  One turn of the agent. `toolCalls` is `[{ tool, input, output }]` for
  whatever the agent chose to run this turn (often empty, e.g. for small talk).
- `GET /api/health` → `{ status: "ok" }`
- `GET /` → basic service info
- Interactive docs at `/docs` (FastAPI's Swagger UI).

## Deployment

- **Frontend → Vercel.** Root directory `ai-researcher-frontend`, framework
  auto-detected as Next.js, set `NEXT_PUBLIC_API_URL`.
- **Backend → Render** (or Railway / Fly.io / Hugging Face Spaces — same
  Dockerfile works for all). `render.yaml` is already set up for Render's
  Blueprint flow. **Not** a serverless platform — the agent needs a
  persistent container (Tectonic on disk, potentially long-running calls).

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full walkthrough, and each
subproject's own README for more detail:
[`ai-researcher-backend/README.md`](./ai-researcher-backend/README.md),
[`ai-researcher-frontend/README.md`](./ai-researcher-frontend/README.md).

## Known limitations

- **Ephemeral disk on free tiers** — rendered PDFs in `output/` are lost on
  redeploy/restart unless you add persistent storage.
- **Cold starts** — free tiers spin down on idle; first request after
  inactivity can take 20–50s.
- **Shared free-tier rate limit** — see "Bring your own Groq API key" above.
- **In-memory checkpointer** — `MemorySaver` keeps conversation state in the
  backend process's RAM, so it resets on every redeploy/restart. Fine for a
  demo; swap for a persistent (SQLite/Postgres-backed) LangGraph checkpointer
  for anything longer-lived.
