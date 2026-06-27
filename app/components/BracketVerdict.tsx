"use client";

// The post-bracket "will this win my pool?" verdict card. Replaces the old scorecard.
// Shows a prompt (with the pool-size control) until the bracket is complete, then the
// pool-finish verdict from /api/predictor/pool-finish (win odds, you-vs-the-model,
// points range, a plain-language read). The Monte Carlo runs server-side.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { recommendRisk, type RiskLevel } from "../../lib/engine/risk";
import { templateVerdict, type PointsRange, type VerdictFacts } from "../../lib/predictor/verdictText";

interface PoolVerdict {
  complete: boolean;
  user?: { winProbability: number; expectedFinish: number; pointsRange: PointsRange };
  chalkWinProbability?: number;
}

export interface BracketVerdictProps {
  picks: [string, number][];
  total: number;
  poolSize: number;
  onPoolSize: (n: number) => void;
  locked: boolean;
  onReset: () => void;
  /** Populate the bracket with a generated prediction (Build box). */
  onGenerate: (picks: [string, number][]) => void;
}

const RISK_LEVELS: RiskLevel[] = ["safe", "balanced", "bold"];
const RISK_LABEL: Record<RiskLevel, string> = { safe: "Safe", balanced: "Balanced", bold: "Bold" };

/** Round a [0,1] probability to a friendly percent string. */
function pct(p: number): string {
  const v = p * 100;
  if (v > 0 && v < 1) return "<1%";
  if (v > 99 && v < 100) return ">99%";
  return `${Math.round(v)}%`;
}

const ORDINALS = ["th", "st", "nd", "rd"];
function ordinal(n: number): string {
  const r = Math.round(n);
  const v = r % 100;
  return `${r}${ORDINALS[(v - 20) % 10] ?? ORDINALS[v] ?? ORDINALS[0]}`;
}

export default function BracketVerdict({ picks, total, poolSize, onPoolSize, locked, onReset, onGenerate }: BracketVerdictProps) {
  const complete = picks.length === total && total > 0;
  const pickKey = useMemo(() => picks.map(([m, t]) => `${m}:${t}`).sort().join(","), [picks]);

  const [verdict, setVerdict] = useState<PoolVerdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  // Build box: risk level, defaulting to (and tracking) the pool-size recommendation
  // until the user moves the slider.
  const rec = recommendRisk(poolSize);
  const [risk, setRisk] = useState<RiskLevel>(rec.risk);
  const userSetRisk = useRef(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [optimize, setOptimize] = useState(false);
  useEffect(() => {
    if (!userSetRisk.current) setRisk(recommendRisk(poolSize).risk);
  }, [poolSize]);

  const freshSeed = () => Math.floor(Math.random() * 2 ** 31);
  const shiftRisk = (dir: 1 | -1): RiskLevel => {
    const i = RISK_LEVELS.indexOf(risk);
    return RISK_LEVELS[Math.min(RISK_LEVELS.length - 1, Math.max(0, i + dir))] ?? risk;
  };

  // Run the generator at `nextRisk` with `seed`, then populate the editable bracket.
  // On failure the existing bracket is left untouched (we only call onGenerate on success).
  async function runGenerate(nextRisk: RiskLevel, seed: number, strategy: "heuristic" | "leverage" = "heuristic") {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/predictor/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ poolSize, risk: nextRisk, seed, strategy }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { picks: [string, number][] };
      if (nextRisk !== risk) {
        userSetRisk.current = true;
        setRisk(nextRisk);
      }
      onGenerate(data.picks);
    } catch (e) {
      setGenError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  // Build box: guard against clobbering in-progress manual picks.
  function generate() {
    if (picks.length > 0 && !window.confirm("Replace your current picks with a generated bracket?")) return;
    void runGenerate(risk, freshSeed(), optimize ? "leverage" : "heuristic");
  }

  useEffect(() => {
    if (!complete) {
      setVerdict(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const id = ++seq.current;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/predictor/pool-finish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ picks, poolSize }),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as PoolVerdict;
        if (id === seq.current) setVerdict(data);
      } catch (e) {
        if (id === seq.current) setError((e as Error).message);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 450);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // pickKey captures the picks; poolSize retriggers on pool change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickKey, poolSize, complete, total]);

  const ready = verdict?.complete && verdict.user;

  // The verdict facts behind the sentence, once the numbers are ready.
  const facts: VerdictFacts | null =
    ready && verdict.user
      ? {
          winProbability: verdict.user.winProbability,
          chalkWinProbability: verdict.chalkWinProbability ?? 0,
          expectedFinish: verdict.user.expectedFinish,
          poolSize,
          pointsRange: verdict.user.pointsRange,
        }
      : null;
  const factsKey = facts
    ? `${facts.winProbability}|${facts.chalkWinProbability}|${facts.expectedFinish}|${facts.poolSize}|${facts.pointsRange.p10}|${facts.pointsRange.p90}`
    : "";

  // Analyst note: fetched separately so it never blocks the numbers. Shows the template
  // immediately; swaps in the Analyst sentence when it arrives; failure leaves the template.
  const [note, setNote] = useState<{ text: string; source: "llm" | "template" } | null>(null);
  const noteSeq = useRef(0);
  useEffect(() => {
    setNote(null);
    if (!facts) return;
    const id = ++noteSeq.current;
    const factsForNote = facts;
    // The bracket's notable teams (champion + finalists) for expert-note relevance.
    const byMatch = new Map(picks);
    const subjects = [byMatch.get("M104"), byMatch.get("M101"), byMatch.get("M102")].filter(
      (x): x is number => typeof x === "number",
    );
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/predictor/verdict-note", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...factsForNote, subjects }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { text?: string; source?: string };
        if (id === noteSeq.current && typeof data.text === "string") {
          setNote({ text: data.text, source: data.source === "llm" ? "llm" : "template" });
        }
      } catch {
        /* leave the template in place */
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factsKey]);

  const sentence = note?.text ?? (facts ? templateVerdict(facts) : "");
  const sentenceSource: "llm" | "template" = note?.source ?? "template";

  return (
    <aside className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--wc-surface)] shadow-lg shadow-black/30">
      {/* Header band with the pool-size control. */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-2.5">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Your verdict</span>
        <label className="flex items-center gap-2 text-[11px] text-slate-300">
          <span>Pool of</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={poolSize}
            onChange={(e) => onPoolSize(Math.max(1, Number(e.target.value) || 1))}
            className="w-14 rounded-md border border-white/15 bg-black/30 px-2 py-0.5 text-right text-slate-50 outline-none focus:border-amber-300"
          />
        </label>
      </div>

      {!complete ? (
        <div className="px-4 py-5">
          <p className="text-center text-sm font-semibold text-slate-200">Don&apos;t want to fill all 31?</p>
          <p className="mx-auto mt-1 max-w-[16rem] text-center text-xs text-slate-400">
            Let the Analyst build a bracket for your pool — then tweak any pick.
          </p>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-500">
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
              onChange={(e) => {
                userSetRisk.current = true;
                setRisk(RISK_LEVELS[Number(e.target.value)] ?? "balanced");
              }}
              disabled={locked}
              className="mt-1 w-full accent-amber-400"
              aria-label="Risk level"
            />
            <p className="mt-1 text-center text-xs">
              <span className="font-semibold text-amber-300">{RISK_LABEL[risk]}</span>
              {risk === rec.risk ? <span className="text-slate-400"> · recommended</span> : null}
            </p>
            <p className="mt-1 text-center text-[11px] text-slate-400">
              Recommended: {RISK_LABEL[rec.risk]} — {rec.rationale}
            </p>
          </div>

          <label className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-300">
            <input type="checkbox" checked={optimize} disabled={generating || locked} onChange={(e) => setOptimize(e.target.checked)} className="accent-amber-400" />
            <span>Optimize for win % <span className="text-slate-500">(slower)</span></span>
          </label>

          <button
            onClick={generate}
            disabled={generating || locked}
            className="mt-2 w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-40"
          >
            {generating ? (optimize ? "Optimizing…" : "Building…") : optimize ? "🎯 Optimize my bracket" : "🪄 Build my bracket for me"}
          </button>
          {genError ? (
            <p className="mt-2 rounded bg-rose-500/10 px-2 py-1 text-center text-[11px] text-rose-300">{genError}</p>
          ) : null}
          <p className="mt-3 text-center text-[11px] text-slate-500">
            {picks.length}/{total} picks made — you can edit every pick after.
          </p>
        </div>
      ) : loading && !ready ? (
        <div className="px-4 py-10 text-center text-sm text-slate-400">Crunching your pool odds…</div>
      ) : error ? (
        <p className="m-4 rounded-lg bg-rose-500/10 px-3 py-3 text-center text-xs text-rose-300">
          Couldn&apos;t compute your verdict. {error}
        </p>
      ) : ready && verdict.user ? (
        <Verdict
          winProb={verdict.user.winProbability}
          chalkWinProb={verdict.chalkWinProbability ?? 0}
          finish={verdict.user.expectedFinish}
          range={verdict.user.pointsRange}
          poolSize={poolSize}
          sentence={sentence}
          sentenceSource={sentenceSource}
          stale={loading}
        />
      ) : (
        <div className="px-4 py-10 text-center text-sm text-slate-400">No verdict yet.</div>
      )}

      {complete ? (
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              Risk: <span className="font-semibold text-amber-300">{RISK_LABEL[risk]}</span>
            </span>
            <div className="flex gap-1.5">
              <RebuildButton onClick={() => runGenerate(shiftRisk(-1), freshSeed())} disabled={generating || locked || risk === "safe"}>
                Safer
              </RebuildButton>
              <RebuildButton onClick={() => runGenerate(risk, freshSeed())} disabled={generating || locked}>
                {generating ? "…" : "↻ Regenerate"}
              </RebuildButton>
              <RebuildButton onClick={() => runGenerate(shiftRisk(1), freshSeed())} disabled={generating || locked || risk === "bold"}>
                Bolder
              </RebuildButton>
            </div>
          </div>
          {genError ? (
            <p className="mt-2 rounded bg-rose-500/10 px-2 py-1 text-center text-[11px] text-rose-300">{genError}</p>
          ) : null}
        </div>
      ) : null}

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

function RebuildButton({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-white/15 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-amber-300/60 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Verdict({
  winProb,
  chalkWinProb,
  finish,
  range,
  poolSize,
  sentence,
  sentenceSource,
  stale,
}: {
  winProb: number;
  chalkWinProb: number;
  finish: number;
  range: PointsRange;
  poolSize: number;
  sentence: string;
  sentenceSource: "llm" | "template";
  stale: boolean;
}) {
  return (
    <div className={stale ? "opacity-60 transition" : "transition"}>
      {/* Hero: will this win my pool? */}
      <div className="px-4 py-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Chance to win your pool of {poolSize}</p>
        <p className="text-5xl font-black leading-tight text-amber-300" data-testid="verdict-winprob">
          {pct(winProb)}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">projected to finish about {ordinal(finish)} of {poolSize}</p>
      </div>

      {/* You vs. the model. */}
      <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 text-center">
        <div className="px-3 py-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">You</p>
          <p className="text-xl font-bold text-emerald-300">{pct(winProb)}</p>
        </div>
        <div className="px-3 py-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Chalk (the model)</p>
          <p className="text-xl font-bold text-slate-200">{pct(chalkWinProb)}</p>
        </div>
      </div>

      {/* Likely points range. */}
      <div className="flex items-baseline justify-between border-t border-white/10 px-4 py-2.5">
        <span className="text-xs uppercase tracking-wide text-slate-400">Likely points</span>
        <span className="text-sm font-bold text-slate-50">
          {Math.round(range.p10)}–{Math.round(range.p90)}
        </span>
      </div>

      {/* Plain-language verdict — Analyst-written when available, else the template. */}
      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-sm text-slate-200">{sentence}</p>
        <span
          className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
            sentenceSource === "llm" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-slate-400"
          }`}
          title={sentenceSource === "llm" ? "Written by the Analyst" : "Auto-generated summary"}
        >
          {sentenceSource === "llm" ? "Analyst" : "Auto"}
        </span>
      </div>
    </div>
  );
}
