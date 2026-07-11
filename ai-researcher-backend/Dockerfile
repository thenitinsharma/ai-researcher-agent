FROM python:3.11-slim

# --- system deps ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# --- install Tectonic (static musl binary, no LaTeX distro needed) ---
RUN curl --proto '=https' --tlsv1.2 -fsSL \
    https://drop-sh.fullyjustified.net | sh \
    && mv tectonic /usr/local/bin/tectonic \
    && chmod +x /usr/local/bin/tectonic

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# --- Hugging Face Spaces runs containers as a non-root user (uid 1000) and
# expects the app on port 7860. This block is a no-op on Render/Railway/Fly
# (they run as root and inject their own $PORT), so the same Dockerfile works
# for both without edits. ---
RUN useradd -m -u 1000 appuser \
    && mkdir -p /app/output \
    && chown -R appuser:appuser /app
USER appuser
ENV HOME=/home/appuser

ENV PORT=7860
EXPOSE 7860

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}

