"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRound, X } from "lucide-react";
import { clearGroqApiKey, getGroqApiKey, setGroqApiKey } from "@/lib/groqKey";

export default function ApiKeySettings() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [savedKeyPresent, setSavedKeyPresent] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing = getGroqApiKey();
    setSavedKeyPresent(!!existing);
    setValue(existing ?? "");
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed) {
      setGroqApiKey(trimmed);
      setSavedKeyPresent(true);
    } else {
      clearGroqApiKey();
      setSavedKeyPresent(false);
    }
    setOpen(false);
  }

  function handleClear() {
    clearGroqApiKey();
    setValue("");
    setSavedKeyPresent(false);
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="API key settings"
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs transition sm:px-4 sm:text-sm ${
          savedKeyPresent
            ? "border-teal-deep text-teal-deep hover:bg-teal-deep hover:text-paper"
            : "border-ink text-ink hover:bg-ink hover:text-paper"
        }`}
      >
        <KeyRound size={14} strokeWidth={1.75} />
        <span className="hidden sm:inline">{savedKeyPresent ? "Your API key" : "Settings"}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-line bg-surface p-4 shadow-card sm:w-96">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-serif text-sm font-semibold text-ink">Your Groq API key</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-inkSoft hover:text-ink"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          <p className="mb-3 text-xs leading-relaxed text-inkSoft">
            This app runs on a shared free-tier Groq key, which can hit rate limits
            during heavy use. Add your own key to use your personal quota instead —
            it's stored only in your browser and sent directly to this app's backend
            with each message.
          </p>

          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="gsk_..."
            autoComplete="off"
            spellCheck={false}
            className="mb-3 w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-xs text-ink placeholder:text-inkSoft/60 focus:border-teal"
          />

          <div className="flex items-center justify-between gap-2">
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-teal-deep underline underline-offset-2 hover:text-teal"
            >
              Get a free key at console.groq.com
            </a>
            <div className="flex gap-2">
              {savedKeyPresent && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-full border border-line px-3 py-1 text-xs text-inkSoft transition hover:border-rust hover:text-rust"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-ink px-3 py-1 text-xs text-paper transition hover:bg-teal-deep"
              >
                Save
              </button>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-inkSoft">
            Need higher limits without managing your own key? Groq's Dev Tier
            raises the tokens-per-minute cap —{" "}
            <a
              href="https://console.groq.com/settings/billing"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-ink"
            >
              see billing
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
