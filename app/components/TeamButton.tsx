"use client";

// Clickable team name that opens a detail dialog: full name, World Cup results
// (full-time scores), and a one-line qualifying-status description.
import { useEffect, useState } from "react";
import { flagFor } from "./flags";
import type { TeamResult } from "./teamResults";

export interface TeamButtonProps {
  abbr: string;
  name: string;
  narration: string;
  results: TeamResult[];
}

function resultColor(r: "W" | "D" | "L"): string {
  return r === "W" ? "text-emerald-400" : r === "L" ? "text-rose-400" : "text-slate-400";
}

export default function TeamButton({ abbr, name, narration, results }: TeamButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full min-w-0 items-center gap-2 text-left"
        title={`${name} — view details`}
      >
        <span className="text-lg leading-none" aria-hidden>{flagFor(abbr)}</span>
        <span className="whitespace-nowrap font-semibold tracking-tight text-slate-100 underline-offset-4 hover:underline">
          {abbr}
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${name} details`}
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#111726] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 text-slate-500 transition hover:text-slate-200"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="mb-1 flex items-center gap-2 text-xl font-bold text-slate-100">
              <span aria-hidden>{flagFor(abbr)}</span>
              <span>{name}</span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-slate-400">{narration}</p>

            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Results</h3>
            {results.length === 0 ? (
              <p className="text-sm text-slate-500">No matches played yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {results.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="text-[11px] uppercase text-slate-500">VS</span>
                      <span aria-hidden>{flagFor(r.opponentAbbr)}</span>
                      <span className="font-medium">{r.opponentAbbr}</span>
                    </span>
                    <span className="flex items-center gap-2.5">
                      <span className="font-bold tabular-nums text-slate-100">
                        {r.teamScore}–{r.opponentScore}
                      </span>
                      <span className={`w-3 text-center text-xs font-bold ${resultColor(r.result)}`}>{r.result}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
