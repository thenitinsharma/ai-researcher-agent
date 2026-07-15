// Stores a visitor's own Groq API key in the browser only — it's sent with
// each /api/chat request so they can use their own quota instead of the
// shared server key hitting Groq's free-tier rate limit. Never sent anywhere
// except this app's own backend, never logged.
const STORAGE_KEY = "ai-researcher:groq-api-key";

export function getGroqApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setGroqApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // ignore (e.g. private browsing / storage disabled)
  }
}

export function clearGroqApiKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
