import os
import json

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from arxiv_tool import arxiv_search
from read_pdf import read_pdf_from_url
from write_pdf import render_latex_to_pdf

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="AI Researcher API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    # Also allow: any Vercel preview/prod URL, and this backend's own Render/HF
    # domain (needed so the Swagger UI's "Try it out" at /docs can call the API
    # — its Origin is the backend's own host, not FRONTEND_URL).
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|https://.*\.hf\.space",
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=OUTPUT_DIR), name="files")


# ---------------------------------------------------------------------------
# LangGraph agent — mirrors ai_researcher_2.py:
#   State -> call_model (model.bind_tools) -> should_continue -> ToolNode -> loop
# The MODEL decides which tool to call and when; there is no direct REST route
# for arxiv_search / read_pdf_from_url / render_latex_to_pdf. The frontend only
# ever talks to /api/chat.
# ---------------------------------------------------------------------------

from typing import Annotated, Literal
from typing_extensions import TypedDict
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langgraph.graph.message import add_messages
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver


class State(TypedDict):
    messages: Annotated[list, add_messages]


INITIAL_PROMPT = """You are an expert researcher in the fields of physics, mathematics,
computer science, quantitative biology, quantitative finance, statistics,
electrical engineering and systems science, and economics.

You are going to analyze recent research papers in one of these fields in
order to identify promising new research directions and then write a new
research paper. For research information or getting papers, ALWAYS use arxiv.org.
You will use the tools provided to search for papers, read them, and write a new
paper based on the ideas you find.

To start with, have a conversation with the user in order to figure out what topic
to research. Then tell them about some recently published papers on that topic.
Once they've decided which paper they're interested in, read it in order
to understand the research that was done and the outcomes.

Pay particular attention to ideas for future research and think carefully
about them, then propose a few. Once the user picks one, write a paper about it,
including mathematical equations, and render it as a LaTeX PDF using the
render_latex_to_pdf tool. When you cite papers, always attach their PDF links."""

TOOLS = [arxiv_search, read_pdf_from_url, render_latex_to_pdf]

# Shared across every compiled graph (server-key or BYO-key) so conversation
# history for a given thread_id is visible no matter which key served which
# turn — only the model client differs per key, not the conversation state.
_checkpointer = MemorySaver()

# Compiled graphs are cheap to keep around and avoid rebuilding a ChatGroq
# client on every single request. Keyed by the Groq API key in use (or the
# sentinel below for the server's own key from the environment).
_SERVER_KEY_SENTINEL = "__server__"
_graphs: dict[str, object] = {}


def _build_graph(api_key: str):
    from langchain_groq import ChatGroq

    model = ChatGroq(model="openai/gpt-oss-120b", api_key=api_key).bind_tools(TOOLS)
    tool_node = ToolNode(TOOLS)

    def call_model(state: State):
        response = model.invoke(state["messages"])
        return {"messages": [response]}

    def should_continue(state: State) -> Literal["tools", "__end__"]:
        last_message = state["messages"][-1]
        if getattr(last_message, "tool_calls", None):
            return "tools"
        return END

    workflow = StateGraph(State)
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", tool_node)
    workflow.add_edge(START, "agent")
    workflow.add_conditional_edges("agent", should_continue)
    workflow.add_edge("tools", "agent")

    return workflow.compile(checkpointer=_checkpointer)


def _get_graph(user_api_key: str | None = None):
    if user_api_key:
        # Don't let a user-supplied key evict/collide with the server's own
        # cached graph, and don't cache indefinitely across many distinct
        # visitor keys either — cap how many we keep around.
        if user_api_key not in _graphs:
            if len(_graphs) > 50:
                _graphs.clear()
            _graphs[user_api_key] = _build_graph(user_api_key)
        return _graphs[user_api_key]

    if _SERVER_KEY_SENTINEL not in _graphs:
        server_key = os.getenv("GROQ_API_KEY")
        if not server_key:
            raise HTTPException(
                status_code=500,
                detail="GROQ_API_KEY is not set on the server, and no personal API key was provided.",
            )
        _graphs[_SERVER_KEY_SENTINEL] = _build_graph(server_key)
    return _graphs[_SERVER_KEY_SENTINEL]


class ChatBody(BaseModel):
    thread_id: str = "default"
    message: str
    # Optional: a visitor's own Groq API key, used instead of the server's.
    # Lets people avoid the shared server key's free-tier rate limit (see
    # https://console.groq.com/settings/billing for higher tiers).
    groq_api_key: str | None = None


def _extract_turn(all_messages: list, sent_human_content: str):
    """Walk back from the end of the message list to the human message we just
    sent, collecting everything the agent did in response: any tool calls it
    made (with their JSON-parsed-if-possible results) and its final reply."""
    turn = []
    for m in reversed(all_messages):
        turn.append(m)
        if isinstance(m, HumanMessage) and m.content == sent_human_content:
            break
    turn.reverse()

    # map tool_call_id -> tool name/args from the AIMessages that requested them
    call_info = {}
    for m in turn:
        if isinstance(m, AIMessage) and m.tool_calls:
            for tc in m.tool_calls:
                call_info[tc["id"]] = {"tool": tc["name"], "input": tc["args"]}

    tool_calls = []
    for m in turn:
        if isinstance(m, ToolMessage):
            info = call_info.get(m.tool_call_id, {"tool": "unknown", "input": {}})
            output = m.content
            try:
                output = json.loads(output)
            except (TypeError, ValueError):
                pass
            tool_calls.append({"tool": info["tool"], "input": info["input"], "output": output})

    reply = ""
    for m in reversed(turn):
        if isinstance(m, AIMessage) and m.content:
            reply = m.content
            break

    return reply, tool_calls


@app.post("/api/chat")
def chat(body: ChatBody):
    user_key = (body.groq_api_key or "").strip() or None
    graph = _get_graph(user_key)
    config = {"configurable": {"thread_id": body.thread_id}}

    # Only prepend the system prompt on a thread's first turn — the checkpointer
    # persists state per thread_id, so resending it every turn would just pile
    # up duplicate system messages.
    existing_state = graph.get_state(config)
    is_new_thread = not existing_state.values.get("messages")

    messages = []
    if is_new_thread:
        messages.append(SystemMessage(content=INITIAL_PROMPT))
    messages.append(HumanMessage(content=body.message))

    try:
        result = graph.invoke({"messages": messages}, config)
    except Exception as e:
        import traceback
        traceback.print_exc()
        detail = f"Agent error: {e}"
        if "rate_limit_exceeded" in str(e) or "413" in str(e):
            detail += (
                "\n\nThis usually means the shared server API key hit Groq's free-tier "
                "rate limit. Add your own Groq API key in Settings (top right) to use "
                "your own quota, or upgrade to a paid tier at "
                "https://console.groq.com/settings/billing."
            )
        raise HTTPException(status_code=500, detail=detail)

    reply, tool_calls = _extract_turn(result["messages"], body.message)
    return {"reply": reply, "toolCalls": tool_calls}


@app.get("/")
def root():
    return {"service": "ai-researcher-backend", "docs": "/docs", "health": "/api/health"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
