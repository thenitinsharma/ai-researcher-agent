# AI Researcher — Backend

FastAPI wrapper around your LangGraph research agent. This mirrors
`ai_researcher_2.py`'s architecture exactly: `model.bind_tools(tools)` +
`StateGraph` + `ToolNode` + `MemorySaver` checkpointer. **The model decides on
its own which tool to call and when** — there is no direct REST route for
`arxiv_search`, `read_pdf_from_url`, or `render_latex_to_pdf`. The frontend only
ever talks to `/api/chat`; everything else happens inside the agent loop.

## What was fixed from your original files

| File | Bug | Fix |
|---|---|---|
| `arxiv_tool.py` | `sortBY=submittedDate` — arXiv's query param is case-sensitive, so this was silently ignored | `sortBy=submittedDate` |
| `arxiv_tool.py` | `if len(papers)==0` checked the dict's key count (always 1), so the empty-results check never fired | checks `len(papers["entries"])` instead |
| `read_pdf.py` | returned `text.split()` — a list of individual words | returns the joined text string |
| `write_pdf.py` | never wrote `latex_code` to the `.tex` file before invoking tectonic on it | writes the file first via `tex_path.write_text(...)` |
| `write_pdf.py` | `subprocess.run(..., cmd=output_dir, ...)` — invalid kwarg, raises `TypeError` | changed to `cwd=output_dir` |
| `ai_researcher_2.py` | resent the system prompt as part of `messages` every turn — with a `MemorySaver` checkpointer this piles up duplicate system messages across turns | `main.py` only prepends the system prompt on a thread's first turn (checked via `graph.get_state(...)`) |

## Architecture

```
POST /api/chat  { thread_id, message }
        │
        ▼
  graph.invoke({"messages": [...]}, config={"thread_id": thread_id})
        │
   ┌────┴────┐
   │  agent   │  model.bind_tools([arxiv_search, read_pdf_from_url, render_latex_to_pdf])
   └────┬────┘
        │ tool_calls present?
        ▼
   ┌────┴────┐
   │  tools   │  ToolNode — runs whichever tool(s) the model asked for
   └────┬────┘
        │
        └──────► loop back to agent until no more tool_calls
                        │
                        ▼
                { reply, toolCalls: [...] }
```

`MemorySaver` persists the full message history (including every tool call and
its result) per `thread_id`, so the frontend only sends the newest user message
each turn — not the whole conversation.

The two "creative" tools (`arxiv_search`, `render_latex_to_pdf`) now return
JSON strings instead of raw Python objects/paths, so `main.py` can parse
structured results (paper lists, PDF download links) back out of the agent's
tool-call trace and hand them to the frontend to render inline in the chat —
still purely a side effect of the agent's own decisions, never a direct call.

## Setup

```bash
# using uv (recommended, matches your existing uv.lock workflow)
uv sync
uv run uvicorn main:app --reload --port 8000

# or plain pip
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

You also need:
- **Tectonic** installed and on `PATH`.
- A `.env` file (copy `.env.example`) with `GOOGLE_API_KEY` set.

## Endpoints

- `POST /api/chat` `{ thread_id, message }` → `{ reply, toolCalls }` — one turn
  of the agent. `toolCalls` is a list of `{ tool, input, output }` for whatever
  the agent chose to run this turn (often empty, e.g. for small talk).
- `GET /api/health` → `{ status: "ok" }`
- `GET /` → basic service info

Interactive docs at `http://localhost:8000/docs`.

## Verified in this environment

- Full `StateGraph` flow tested end-to-end with a stubbed model standing in for
  Gemini: a search request correctly triggers `arxiv_search`, the structured
  JSON result is correctly extracted and attached to the response, and a
  second turn on the same `thread_id` does **not** duplicate the system prompt
  in the persisted checkpoint state.
- `_extract_turn` unit-tested against a hand-built LangChain message transcript
  (system → human → AI-with-tool-call → tool-result → final AI reply).
- Confirmed `/api/search`, `/api/read-pdf`, `/api/render-pdf` routes no longer
  exist — `/api/chat` is the only route that touches the tools.
- `/api/chat` against the *real* Gemini model wasn't exercised here (needs
  `GOOGLE_API_KEY` + network access to Google's API) — test that once deployed.
