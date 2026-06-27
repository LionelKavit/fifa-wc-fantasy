"use client";

// Interactive knockout bracket. Holds the fan's picks client-side, persists them
// locally, and posts them to /api/predictor/evaluate for server-side scoring and
// the "you vs. the model" comparison. The simulation never runs in the browser.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flagFor } from "./flags";
import { encodePrediction } from "../../lib/predictionCode";
import BracketVerdict from "./BracketVerdict";

/** Context the shell's shared chat needs about the current bracket. */
export interface BracketContextValue {
  picks: [string, number][];
  poolSize: number;
}

const STAGE_LABEL: Record<Stage, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarterfinal",
  SF: "Semifinal",
  F: "Final",
};

const csvCell = (s: string): string => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

type Stage = "R32" | "R16" | "QF" | "SF" | "F";
const STAGES: { key: Stage; label: string }[] = [
  { key: "R32", label: "Round of 32" },
  { key: "R16", label: "Round of 16" },
  { key: "QF", label: "Quarterfinals" },
  { key: "SF", label: "Semifinals" },
  { key: "F", label: "Final" },
];

interface UITeam {
  teamId: number;
  abbr: string;
  name: string;
}
interface UISlot {
  label: string;
  team: UITeam | null;
  projected?: boolean;
  fromMatch?: string;
  winProb?: number;
}
interface UIMatch {
  id: string;
  matchNumber: number;
  stage: Stage;
  slots: [UISlot, UISlot];
  winner: UITeam | null;
  upset?: boolean;
}
export interface BracketData {
  fetchedAt: string;
  locked: boolean;
  projected: boolean;
  matches: UIMatch[];
  championOdds: Record<number, number>;
}

type PickStatus = "pending" | "correct" | "wrong" | "busted";
interface PickInfo {
  matchId: string;
  pickedTeamId: number;
  modelProb: number;
  headToHead: number;
  status: PickStatus;
  bold: boolean;
  upsetBonus: number;
  expectedPoints: number;
}
interface Evaluation {
  score: { current: number; maxAchievable: number; picks: { matchId: string; status: PickStatus }[] };
  comparison: {
    picks: PickInfo[];
    survival: Record<Stage, number>;
    headlineSurvival: number;
    upsetBonusCurrent: number;
    upsetBonusMax: number;
    projectedScore: number;
    boldnessCount: number;
    boldnessShare: number;
  };
}

type Picks = Record<string, number>;

const pct = (p: number): string => `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;

const STATUS_RING: Record<PickStatus, string> = {
  pending: "ring-slate-500",
  correct: "ring-emerald-400",
  wrong: "ring-rose-500",
  busted: "ring-rose-700 opacity-60",
};

/** Self-fetching wrapper: loads the bracket once on mount, then renders the board.
 * `onContextChange` reports the current picks + pool size up to the shell's chat. */
export default function BracketPredictor({
  onContextChange,
}: {
  onContextChange?: (ctx: BracketContextValue) => void;
}) {
  const [data, setData] = useState<BracketData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/bracket")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Failed to load bracket (${r.status})`))))
      .then((d: BracketData) => alive && setData(d))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="px-4 py-10 text-center text-sm text-slate-500">Loading the bracket…</p>;
  return <BracketBoard data={data} onContextChange={onContextChange} />;
}

function BracketBoard({
  data,
  onContextChange,
}: {
  data: BracketData;
  onContextChange?: (ctx: BracketContextValue) => void;
}) {
  const { matches, locked } = data;

  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const childByFeeder = useMemo(() => {
    const c = new Map<string, string>();
    for (const m of matches) for (const s of m.slots) if (s.fromMatch) c.set(s.fromMatch, m.id);
    return c;
  }, [matches]);
  const teamById = useMemo(() => {
    const t = new Map<number, UITeam>();
    for (const m of matches) {
      for (const s of m.slots) if (s.team) t.set(s.team.teamId, s.team);
      if (m.winner) t.set(m.winner.teamId, m.winner);
    }
    return t;
  }, [matches]);

  // Storage key tied to the R32 identity, so a stale bracket is discarded cleanly.
  const storageKey = useMemo(() => {
    const r32 = matches
      .filter((m) => m.stage === "R32")
      .flatMap((m) => m.slots.map((s) => s.team?.teamId ?? 0))
      .sort((a, b) => a - b)
      .join(",");
    return `pocket-scout:predictor:${r32}`;
  }, [matches]);

  const [picks, setPicks] = useState<Picks>({});
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [poolSize, setPoolSize] = useState(10);

  // Restore saved picks once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setPicks(JSON.parse(raw) as Picks);
    } catch {
      /* ignore corrupt storage */
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: Picks) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage may be unavailable */
      }
    },
    [storageKey],
  );

  /** The two participant team ids of a match, given current picks. */
  const participantsOf = useCallback(
    (matchId: string, p: Picks): [number | null, number | null] => {
      const m = matchById.get(matchId);
      if (!m) return [null, null];
      const resolve = (slot: UISlot): number | null => {
        if (slot.team) return slot.team.teamId;
        if (slot.fromMatch) return p[slot.fromMatch] ?? null;
        return null;
      };
      return [resolve(m.slots[0]), resolve(m.slots[1])];
    },
    [matchById],
  );

  const onPick = useCallback(
    (matchId: string, teamId: number) => {
      if (locked) return;
      setPicks((prev) => {
        const [a, b] = participantsOf(matchId, prev);
        if (teamId !== a && teamId !== b) return prev;
        const next: Picks = { ...prev, [matchId]: teamId };
        // Cascade: clear downstream picks that are no longer reachable.
        let cur = childByFeeder.get(matchId);
        while (cur) {
          const [x, y] = participantsOf(cur, next);
          const picked = next[cur];
          if (picked !== undefined && picked !== x && picked !== y) {
            delete next[cur];
            cur = childByFeeder.get(cur);
          } else break;
        }
        persist(next);
        return next;
      });
    },
    [locked, participantsOf, childByFeeder, persist],
  );

  const reset = useCallback(() => {
    setPicks({});
    setEvaluation(null);
    persist({});
  }, [persist]);

  // Populate the bracket from a generated prediction (Build box). Editable afterward.
  const applyGenerated = useCallback(
    (entries: [string, number][]) => {
      const next: Picks = {};
      for (const [m, t] of entries) next[m] = t;
      setPicks(next);
      persist(next);
    },
    [persist],
  );

  // Debounced server evaluation whenever picks change.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (Object.keys(picks).length === 0) {
      setEvaluation(null);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/predictor/evaluate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ picks: Object.entries(picks).map(([m, t]) => [m, t]) }),
        });
        if (res.ok) setEvaluation((await res.json()) as Evaluation);
      } catch {
        /* leave previous evaluation in place */
      }
    }, 450);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [picks]);

  const pickInfo = useMemo(() => {
    const m = new Map<string, PickInfo>();
    for (const p of evaluation?.comparison.picks ?? []) m.set(p.matchId, p);
    return m;
  }, [evaluation]);

  // Report the current bracket context up so the shell's shared chat can send it.
  useEffect(() => {
    onContextChange?.({ picks: Object.entries(picks).map(([m, t]) => [m, t]), poolSize });
  }, [picks, poolSize, onContextChange]);

  const filled = Object.keys(picks).length;

  const shareUrl = useMemo(
    () => `/api/share?p=${encodeURIComponent(encodePrediction(Object.entries(picks).map(([m, t]) => [m, t])))}`,
    [picks],
  );

  const nameOf = useCallback((id: number | null) => (id !== null ? teamById.get(id)?.name ?? "TBD" : "TBD"), [teamById]);

  /** Ordered [round, matchup, pick] rows for the picks the user has made. */
  const pickedRows = useCallback((): { round: string; matchup: string; pick: string }[] => {
    const ordered = matches.slice().sort((a, b) => a.matchNumber - b.matchNumber);
    const rows: { round: string; matchup: string; pick: string }[] = [];
    for (const m of ordered) {
      const teamId = picks[m.id];
      if (teamId === undefined) continue;
      const [a, b] = participantsOf(m.id, picks);
      rows.push({ round: STAGE_LABEL[m.stage], matchup: `${nameOf(a)} vs ${nameOf(b)}`, pick: nameOf(teamId) });
    }
    return rows;
  }, [matches, picks, participantsOf, nameOf]);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = useCallback(() => {
    const rows: string[][] = [["Round", "Matchup", "Pick"]];
    for (const r of pickedRows()) rows.push([r.round, r.matchup, r.pick]);
    const champ = picks["M104"] ? teamById.get(picks["M104"])?.name ?? "" : "";
    if (champ) rows.push(["Champion", "", champ]);
    triggerDownload(new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }), "my-bracket.csv");
  }, [pickedRows, picks, teamById]);

  const downloadPng = useCallback(async () => {
    const res = await fetch(shareUrl);
    if (res.ok) triggerDownload(await res.blob(), "my-bracket.png");
  }, [shareUrl]);

  const downloadPdf = useCallback(async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const champ = picks["M104"] ? teamById.get(picks["M104"])?.name ?? null : null;
    let y = 56;
    doc.setFontSize(20).setFont("helvetica", "bold").text("My World Cup 2026 Bracket", 40, y);
    y += 22;
    doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(120);
    doc.text(`Champion: ${champ ?? "—"}`, 40, y);
    doc.setTextColor(20);
    y += 24;
    let lastRound = "";
    for (const r of pickedRows()) {
      if (r.round !== lastRound) {
        y += 10;
        doc.setFont("helvetica", "bold").setFontSize(13).text(r.round, 40, y);
        lastRound = r.round;
        y += 16;
      }
      doc.setFont("helvetica", "normal").setFontSize(11);
      doc.text(`${r.matchup}  →  ${r.pick}`, 52, y);
      y += 16;
      if (y > 780) {
        doc.addPage();
        y = 56;
      }
    }
    doc.save("my-bracket.pdf");
  }, [pickedRows, picks, teamById]);

  return (
    <div>
      {data.projected && (
        <p className="mb-4 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-center text-xs text-teal-200">
          🔮 Round of 32 is <strong>projected</strong> from the model — not yet official. These teams update as
          groups finish and the real draw is set.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <BracketVerdict
          picks={Object.entries(picks).map(([m, t]) => [m, t] as [string, number])}
          total={matches.length}
          poolSize={poolSize}
          onPoolSize={setPoolSize}
          locked={locked}
          onReset={reset}
          onGenerate={applyGenerated}
        />
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Lock &amp; export</p>
          <p className="mb-3 mt-1 text-[11px] text-slate-400">Happy with it? Take your picks to your pool.</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["⬇ CSV", downloadCsv],
              ["🖼 PNG", downloadPng],
              ["📄 PDF", downloadPdf],
            ] as const).map(([label, onClick]) => (
              <button
                key={label}
                onClick={onClick}
                disabled={filled === 0}
                className="rounded-lg border border-white/15 px-2 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-300/60 disabled:opacity-40"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4">
          {STAGES.map(({ key, label }) => (
            <div key={key} className="flex min-w-[180px] flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</h2>
              {matches
                .filter((m) => m.stage === key)
                .map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    participants={participantsOf(m.id, picks)}
                    teamById={teamById}
                    pickedId={picks[m.id] ?? null}
                    info={pickInfo.get(m.id) ?? null}
                    locked={locked}
                    onPick={onPick}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

function Headline({
  evaluation,
  champion,
  filled,
  total,
  locked,
  onReset,
  poolSize,
  onPoolSize,
}: {
  evaluation: Evaluation | null;
  champion: UITeam | null | undefined;
  filled: number;
  total: number;
  locked: boolean;
  onReset: () => void;
  poolSize: number;
  onPoolSize: (n: number) => void;
}) {
  const c = evaluation?.comparison;
  return (
    <aside className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--wc-surface)] shadow-lg shadow-black/30">
      {/* Scorecard header band */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-2.5">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Your scorecard</span>
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

      {locked && (
        <p className="border-b border-white/10 bg-amber-500/15 px-4 py-2 text-xs text-amber-200">
          🔒 The knockouts have started — your bracket is locked.
        </p>
      )}

      {/* Hero: projected score */}
      <div className="px-4 py-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Projected score</p>
        <p className={`text-5xl font-black leading-tight ${c ? "text-amber-300" : "text-slate-600"}`} data-testid="headline-projected">
          {c ? Math.round(c.projectedScore) : "0"}
        </p>
        <p className="text-[11px] text-slate-400">
          expected points · {filled}/{total} picks made
        </p>
      </div>

      {/* Standings rows */}
      <dl className="divide-y divide-white/5 border-t border-white/10 text-sm">
        <Row label="Still alive" testId="headline-survival" value={c ? pct(c.headlineSurvival) : "—"} hint="whole bracket" accent="green" />
        <Row label="Score" value={evaluation ? `${evaluation.score.current}` : "—"} hint={evaluation ? `of ${evaluation.score.maxAchievable} max` : undefined} />
        <Row label="Upset bonus" value={c ? `+${c.upsetBonusCurrent.toFixed(0)}` : "—"} hint={c ? `up to +${c.upsetBonusMax.toFixed(0)}` : undefined} accent="gold" />
        <Row label="Boldness" value={c ? `${c.boldnessCount} upsets` : "—"} hint={c ? `${pct(c.boldnessShare)} of picks` : undefined} />
        <Row label="Champion" value={champion ? `${flagFor(champion.abbr)} ${champion.abbr}` : "—"} />
      </dl>

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

function Row({
  label,
  value,
  hint,
  testId,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  testId?: string;
  accent?: "gold" | "green";
}) {
  const valueColor = accent === "gold" ? "text-amber-300" : accent === "green" ? "text-emerald-300" : "text-slate-50";
  return (
    <div className="flex items-baseline justify-between px-4 py-2.5">
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-right">
        <span className={`font-bold ${valueColor}`} data-testid={testId}>
          {value}
        </span>
        {hint && <span className="ml-2 text-[11px] text-slate-400">{hint}</span>}
      </dd>
    </div>
  );
}

function MatchCard({
  match,
  participants,
  teamById,
  pickedId,
  info,
  locked,
  onPick,
}: {
  match: UIMatch;
  participants: [number | null, number | null];
  teamById: Map<number, UITeam>;
  pickedId: number | null;
  info: PickInfo | null;
  locked: boolean;
  onPick: (matchId: string, teamId: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-2">
      {match.upset && (
        <p className="mb-1 text-[10px] font-semibold text-orange-400" title="The model rates this close — upset watch">
          💥 upset watch
        </p>
      )}
      <div className="flex flex-col gap-1">
        {match.slots.map((slot, i) => {
          const teamId = participants[i] ?? null;
          const team = teamId !== null ? teamById.get(teamId) ?? null : null;
          // Undetermined slots read as quiet, blank cells (no verbose feeder labels).
          if (!team) {
            return (
              <div
                key={i}
                className="flex h-[34px] items-center rounded-lg border border-dashed border-white/5 px-2 text-sm text-slate-600 select-none"
                aria-hidden
              >
                ·
              </div>
            );
          }
          const picked = pickedId === teamId;
          const status = picked && info ? info.status : "pending";
          return (
            <button
              key={i}
              disabled={locked}
              onClick={() => onPick(match.id, team.teamId)}
              className={[
                "flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition",
                picked ? `bg-slate-700 text-slate-50 ring-2 ${STATUS_RING[status]}` : "bg-slate-800/50 text-slate-100 hover:bg-slate-700/70",
              ].join(" ")}
            >
              <span className="truncate">
                <span className={slot.projected ? "italic" : ""} title={slot.projected ? "Projected by the model — not yet official" : undefined}>
                  <span aria-hidden>{flagFor(team.abbr)}</span> {team.abbr}
                  {slot.projected && <span className="ml-1 text-[9px] text-emerald-300/80">proj</span>}
                </span>
              </span>
              <span className="ml-2 flex shrink-0 items-center gap-1 text-[10px] text-slate-300">
                {picked && info?.bold && <span title="Head-to-head underdog pick">💥</span>}
                {slot.winProb !== undefined
                  ? `${pct(slot.winProb)}${picked && info ? ` · ${info.expectedPoints.toFixed(1)} pts` : ""}`
                  : picked && info
                    ? `${pct(info.modelProb)} · ${info.expectedPoints.toFixed(1)} pts`
                    : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
