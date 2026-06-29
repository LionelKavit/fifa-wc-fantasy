"use client";

// The post-bracket "Your bracket settings" panel: a persistent builder. Pool size + risk
// drive an autofill (the Analyst builds a complete, editable bracket), which the user then
// tweaks and exports. No verdict/percentages — "is this good?" is handled by the Scout chat.

import { useState } from "react";
import { type RiskLevel } from "../../lib/engine/risk";

export interface BracketVerdictProps {
  picks: [string, number][];
  total: number;
  poolSize: number;
  onPoolSize: (n: number) => void;
  locked: boolean;
  onReset: () => void;
  /** Populate the bracket with a generated prediction. */
  onGenerate: (picks: [string, number][]) => void;
}

const RISK_LEVELS: RiskLevel[] = ["safe", "balanced", "bold"];
const RISK_LABEL: Record<RiskLevel, string> = { safe: "Safe", balanced: "Balanced", bold: "Bold" };

export default function BracketVerdict({ picks, total, poolSize, onPoolSize, locked, onReset, onGenerate }: BracketVerdictProps) {
  const hasPicks = picks.length > 0;
  const complete = total > 0 && picks.length === total;
  const [risk, setRisk] = useState<RiskLevel>("balanced");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Pool size is a plain text field (no steppers). Only a whole number > 0 is valid; the
  // raw text is tracked locally and the numeric pool size is applied only when valid.
  const [poolText, setPoolText] = useState<string>(() => String(poolSize));
  const poolValid = /^\d+$/.test(poolText.trim()) && Number(poolText) >= 1;

  function onPoolText(value: string) {
    setPoolText(value);
    if (/^\d+$/.test(value.trim()) && Number(value) >= 1) onPoolSize(Number(value));
  }

  const freshSeed = () => Math.floor(Math.random() * 2 ** 31);

  // Complete the bracket from its current state: send the existing picks so the generator
  // keeps them and fills only the gaps. On failure the existing bracket is left untouched.
  async function runGenerate(seed: number) {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/predictor/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ poolSize, risk, seed, picks }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { picks: [string, number][] };
      onGenerate(data.picks);
    } catch (e) {
      setGenError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  // Completion only fills gaps — existing picks are kept, so no overwrite confirmation.
  // A fresh seed varies which upsets fill the open matches; locked picks never change.
  function build() {
    void runGenerate(freshSeed());
  }

  return (
    <aside className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--wc-surface)] shadow-lg shadow-black/30">
      <div className="border-b border-white/10 bg-black/20 px-4 py-2.5">
        <span className="whitespace-nowrap text-xs font-bold uppercase tracking-wide text-amber-300">Need help filling your bracket?</span>
      </div>

      <div className="px-4 py-5">
        {/* Approximate pool size — tunes how bold the autofill is. Title + helper are
            grouped so the helper reads as a subtitle of the field; input sits alongside. */}
        <div>
          <label className="flex items-center justify-between gap-3">
            <span className="min-w-0 text-sm font-semibold leading-snug text-slate-200">
              How many people are in your pool?
              <span className="ml-1.5 text-[11px] font-normal text-slate-500">Helps model measure risk.</span>
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={poolText}
              onChange={(e) => onPoolText(e.target.value)}
              disabled={locked}
              aria-label="Approximate pool size"
              aria-invalid={!poolValid}
              className={`w-16 shrink-0 rounded-md border bg-black/30 px-2 py-1 text-right text-sm text-slate-50 outline-none disabled:opacity-40 ${
                poolValid ? "border-white/15 focus:border-amber-300" : "border-rose-400/70 focus:border-rose-400"
              }`}
            />
          </label>
          {!poolValid ? (
            <p className="mt-1 text-[11px] text-rose-300">Enter a number greater than 0.</p>
          ) : null}
        </div>

        {/* Risk level. */}
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-200">Choose risk level</p>
          <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-500">
            <span>Safe</span>
            <span>Balanced</span>
            <span>Bold</span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={RISK_LEVELS.indexOf(risk)}
            onChange={(e) => setRisk(RISK_LEVELS[Number(e.target.value)] ?? "balanced")}
            disabled={locked}
            className="mt-1 w-full accent-amber-400"
            aria-label="Risk level"
          />
          <p className="mt-1 text-center text-xs">
            <span className="font-semibold text-amber-300">{RISK_LABEL[risk]}</span>
          </p>
        </div>

        <button
          onClick={build}
          disabled={generating || locked || complete || !poolValid}
          className="mt-4 w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-40"
        >
          {generating
            ? "Building…"
            : complete
              ? "✓ Bracket complete"
              : hasPicks
                ? "Finish my bracket"
                : "Build my bracket for me"}
        </button>
        {genError ? (
          <p className="mt-2 rounded bg-rose-500/10 px-2 py-1 text-center text-[11px] text-rose-300">{genError}</p>
        ) : null}
        <p className="mt-3 text-center text-[11px] text-slate-500">
          {picks.length}/{total} picks made — you can edit every pick after.
        </p>
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <button
          onClick={onReset}
          disabled={locked}
          className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-300/60 disabled:opacity-40"
        >
          Clear bracket
        </button>
      </div>
    </aside>
  );
}
