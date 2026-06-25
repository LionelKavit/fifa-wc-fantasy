"use client";

// The Scout chat panel (dark themed). Streams answers from /api/chat, keeps the
// conversation in state and sends prior turns each request (multi-turn), labels
// whether the answer came from the Scout (LLM) or the deterministic Stats fallback.

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  source?: string | null;
}

const SUGGESTIONS = ["What does Mexico need?", "What are Sweden's chances?", "How does Group F look?"];

function SourceTag({ source }: { source?: string | null }) {
  if (!source) return null;
  const isLlm = source === "llm";
  return (
    <span
      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
        isLlm ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-slate-400"
      }`}
      title={isLlm ? "Answered by the Scout (LLM)" : "Answered from deterministic stats (no API key)"}
    >
      {isLlm ? "Scout" : "Stats"}
    </span>
  );
}

export default function ScoutChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    setInput("");

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((cur) => [...cur, { role: "user", content: question }, { role: "assistant", content: "", source: null }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const source = res.headers.get("x-scout-source");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((cur) => {
          const copy = cur.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc, source };
          return copy;
        });
      }
    } catch (e) {
      setError((e as Error).message);
      setMessages((cur) => cur.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-[28rem] flex-col rounded-2xl border border-white/10 bg-[#111726]/80 shadow-lg shadow-black/20">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-100">Ask the Scout</h2>
        <p className="text-[11px] text-slate-500">Qualification questions, grounded in the numbers.</p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-slate-300 transition hover:border-amber-300/40 hover:bg-amber-300/5"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-200"
                }`}
              >
                {m.content || (busy ? "…" : "")}
              </div>
              {m.role === "assistant" && m.content ? (
                <div className="mt-0.5">
                  <SourceTag source={m.source} />
                </div>
              ) : null}
            </div>
          ))
        )}
        {error ? <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p> : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-white/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a team or group…"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-300/60"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-40"
        >
          {busy ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
