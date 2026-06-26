"use client";

// Interactive knockout bracket. Holds the fan's picks client-side, persists them
// locally, and posts them to /api/predictor/evaluate for server-side scoring and
// the "you vs. the model" comparison. The simulation never runs in the browser.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flagFor } from "./flags";

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

export default function BracketPredictor({ data }: { data: BracketData }) {
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

  const champion = picks["M104"] ? teamById.get(picks["M104"]) : null;
  const filled = Object.keys(picks).length;

  return (
    <div>
      {data.projected && (
        <p className="mb-4 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-center text-xs text-teal-200">
          🔮 Round of 32 is <strong>projected</strong> from the model — not yet official. These teams update as
          groups finish and the real draw is set.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Headline
        evaluation={evaluation}
        champion={champion}
        filled={filled}
        total={matches.length}
        locked={locked}
        onReset={reset}
      />

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
}: {
  evaluation: Evaluation | null;
  champion: UITeam | null | undefined;
  filled: number;
  total: number;
  locked: boolean;
  onReset: () => void;
}) {
  const c = evaluation?.comparison;
  return (
    <aside className="lg:sticky lg:top-6 lg:self-start rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
      {locked && (
        <p className="mb-3 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-300">
          🔒 The knockouts have started — your bracket is locked.
        </p>
      )}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-800/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Projected score</p>
          <p className="text-3xl font-extrabold text-amber-300" data-testid="headline-projected">
            {c ? Math.round(c.projectedScore) : "—"}
          </p>
          <p className="text-[10px] text-slate-500">expected points (model)</p>
        </div>
        <div className="rounded-xl bg-slate-800/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Still alive</p>
          <p className="text-3xl font-extrabold text-teal-300" data-testid="headline-survival">
            {c ? pct(c.headlineSurvival) : "—"}
          </p>
          <p className="text-[10px] text-slate-500">whole bracket survives</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Champion" value={champion ? `${flagFor(champion.abbr)} ${champion.abbr}` : "—"} />
        <Stat label="Filled" value={`${filled}/${total}`} />
        <Stat
          label="Score"
          value={evaluation ? `${evaluation.score.current}` : "—"}
          hint={evaluation ? `max ${evaluation.score.maxAchievable}` : undefined}
        />
        <Stat
          label="Upset bonus"
          value={c ? `+${c.upsetBonusCurrent.toFixed(0)}` : "—"}
          hint={c ? `up to +${c.upsetBonusMax.toFixed(0)}` : undefined}
        />
        <Stat
          label="Boldness"
          value={c ? `${c.boldnessCount} upsets` : "—"}
          hint={c ? `${pct(c.boldnessShare)} of picks` : undefined}
        />
        <Stat
          label="Total so far"
          value={evaluation && c ? `${(evaluation.score.current + c.upsetBonusCurrent).toFixed(0)}` : "—"}
          hint="base + upset"
        />
      </dl>

      <button
        onClick={onReset}
        disabled={locked}
        className="mt-4 w-full rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-400 disabled:opacity-40"
      >
        Clear bracket
      </button>
    </aside>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-slate-800/60 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-100">{value}</dd>
      {hint && <dd className="text-[10px] text-slate-500">{hint}</dd>}
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
          const picked = teamId !== null && pickedId === teamId;
          const status = picked && info ? info.status : "pending";
          return (
            <button
              key={i}
              disabled={locked || team === null}
              onClick={() => team && onPick(match.id, team.teamId)}
              className={[
                "flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition",
                team ? "hover:bg-slate-700/60" : "cursor-default",
                picked ? `bg-slate-700 ring-2 ${STATUS_RING[status]}` : "bg-slate-800/40 text-slate-300",
              ].join(" ")}
            >
              <span className="truncate">
                {team ? (
                  <span className={slot.projected ? "italic" : ""} title={slot.projected ? "Projected by the model — not yet official" : undefined}>
                    <span aria-hidden>{flagFor(team.abbr)}</span> {team.abbr}
                    {slot.projected && <span className="ml-1 text-[9px] text-teal-400/70">proj</span>}
                  </span>
                ) : (
                  <span className="text-slate-500">{slot.label}</span>
                )}
              </span>
              <span className="ml-2 flex shrink-0 items-center gap-1 text-[10px] text-slate-400">
                {picked && info?.bold && <span title="Head-to-head underdog pick">💥</span>}
                {picked && info
                  ? `${pct(info.modelProb)} · ${info.expectedPoints.toFixed(1)} pts`
                  : slot.winProb !== undefined
                    ? pct(slot.winProb)
                    : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
