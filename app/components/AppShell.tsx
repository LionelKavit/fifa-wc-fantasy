"use client";

// The unified app shell: one page, two tabs (Knockouts first/default, then Group
// stage), with a single Analyst chat rendered once so the conversation persists
// across tab switches. The chat sends bracket context only on the Knockouts tab.
import { useEffect, useState, type ReactNode } from "react";
import BracketPredictor, { type BracketContextValue } from "./BracketPredictor";
import ScoutChat from "./ScoutChat";

type Tab = "knockouts" | "group";

const KNOCKOUT_SUGGESTIONS = [
  "Is my bracket too safe to win?",
  "How's my bracket looking?",
  { label: 'Quick verdict — just type "NED vs MAR"', value: "NED vs MAR" },
];
const GROUP_SUGGESTIONS = ["What does Mexico need?", "What are Sweden's chances?", "How does Group F look?"];

function initialTab(): Tab {
  if (typeof window === "undefined") return "knockouts";
  return new URLSearchParams(window.location.search).get("tab") === "group" ? "group" : "knockouts";
}

export default function AppShell({ groupPanel }: { groupPanel: ReactNode }) {
  const [tab, setTab] = useState<Tab>("knockouts");
  const [bracketCtx, setBracketCtx] = useState<BracketContextValue>({ picks: [], poolSize: 10 });

  // Read the initial tab from the URL (?tab=) after mount; keep it linkable on switch.
  useEffect(() => setTab(initialTab()), []);
  function selectTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mx-auto mb-6 h-1 w-24 rounded-full bg-gradient-to-r from-amber-300 to-emerald-500" />
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">
          <span aria-hidden>🏆</span>{" "}
          <span className="bg-gradient-to-r from-amber-200 to-emerald-300 bg-clip-text text-transparent">
            FIFA World Cup 2026 Bracket Analyst
          </span>
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-300">
          Fill your knockout bracket and get grounded strategy from the Analyst.
        </p>
      </header>

      <div className="mb-6 flex justify-center gap-2">
        {(["knockouts", "group"] as const).map((t) => (
          <button
            key={t}
            onClick={() => selectTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t
                ? "bg-amber-400 text-slate-950"
                : "border border-white/10 text-slate-300 hover:border-amber-300/40"
            }`}
          >
            {t === "knockouts" ? "Knockouts" : "Group stage"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {/* Both panels stay mounted; visibility toggles so state + scroll persist. */}
          <div className={tab === "knockouts" ? "" : "hidden"}>
            <BracketPredictor onContextChange={setBracketCtx} />
          </div>
          <div className={tab === "group" ? "" : "hidden"}>{groupPanel}</div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <ScoutChat
            title="Ask the Analyst"
            subtitle="World Cup strategy, grounded in the model."
            placeholder={tab === "knockouts" ? "Is this pick smart? How's my bracket?" : "Ask about a team or group…"}
            suggestions={tab === "knockouts" ? KNOCKOUT_SUGGESTIONS : GROUP_SUGGESTIONS}
            extraBody={() =>
              tab === "knockouts" ? { picks: bracketCtx.picks, poolSize: bracketCtx.poolSize } : {}
            }
          />
        </aside>
      </div>
    </main>
  );
}
