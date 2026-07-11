# Deploying AI Researcher

Two separate deployments: the Next.js frontend goes on **Vercel**, the FastAPI
backend goes somewhere that runs a persistent container (**Render**, **Railway**,
**Fly.io**, or **Hugging Face Spaces**) — not a serverless platform, because it
needs the Tectonic binary on disk and the agent calls can run long.

---

## 1. Backend first (you need its URL before configuring the frontend)

### Option A — Render (recommended, has render.yaml already set up)

1. Push `ai-researcher-backend/` to a GitHub repo.
2. Render dashboard → **New → Blueprint** → connect the repo → Render reads
   `render.yaml` and configures everything (Docker build, health check path,
   free plan). Or **New → Web Service** manually if you'd rather not use the
   blueprint — set **Root Directory** to `ai-researcher-backend` if it's a
   subfolder of a monorepo.
3. Environment variables (Render → your service → Environment):
   - `GOOGLE_API_KEY` = your Gemini key
   - `FRONTEND_URL` = your Vercel URL (set after step 2 in the next section;
     `*` temporarily is fine during setup — the backend's CORS also already
     allows any `*.vercel.app`, `*.onrender.com`, `*.hf.space` origin via regex)
4. Deploy. Render gives you a URL like `https://ai-researcher-backend.onrender.com`.
5. **Free tier disk is ephemeral** — generated PDFs in `output/` are lost on
   redeploy/restart. Fine for demoing; add a Render persistent disk (Settings →
   Disks) mounted at `/app/output` for anything longer-lived.

### Option B — Railway / Option C — Fly.io / Option D — Hugging Face Spaces

Same Dockerfile works for all of them. See the earlier version of this file in
chat history for the full walkthrough of each, or ask again if you switch to
one of these later — happy to write out the exact steps.

### Quick sanity check once deployed

```bash
curl https://your-backend-url/api/health
# -> {"status":"ok"}
curl https://your-backend-url/
# -> {"service":"ai-researcher-backend","docs":"/docs","health":"/api/health"}
```

---

## 2. Frontend on Vercel

1. Push `ai-researcher-frontend/` to GitHub.
2. Vercel dashboard → **Add New → Project** → import the repo → set **Root
   Directory** to `ai-researcher-frontend` if it's a subfolder.
3. Framework preset: Next.js (auto-detected).
4. Environment variable:
   - `NEXT_PUBLIC_API_URL` = your backend URL from step 1
5. Deploy → you get `https://your-app.vercel.app`.
6. Set the backend's `FRONTEND_URL` to this exact URL and redeploy the backend
   (the CORS regex already covers any `*.vercel.app`, so this is a belt-and-
   suspenders step, not strictly required).

---

## 3. Things that will bite you in production (not demo/local)

- **Ephemeral disk**: rendered PDFs disappear on container restart unless you
  add a persistent volume or move to object storage (S3, Cloudinary, R2).
- **Cold starts**: free tiers spin down on idle — first request after
  inactivity can take 20–50s.
- **Gemini rate limits**: `/api/chat` makes a live Gemini call per turn (and
  potentially several more if the agent chains multiple tool calls); add basic
  rate limiting (e.g. `slowapi`) before sharing the URL publicly.
- **In-memory checkpointer**: `MemorySaver` keeps conversation state in the
  backend process's RAM — it resets on every redeploy/restart/cold-start. For
  anything beyond a demo, swap it for a persistent checkpointer (LangGraph
  supports SQLite/Postgres-backed ones).
