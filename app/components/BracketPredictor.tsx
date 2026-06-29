"use client";

// Interactive knockout bracket. Holds the fan's picks client-side, persists them
// locally, and posts them to /api/predictor/evaluate for server-side scoring and
// the "you vs. the model" comparison. The simulation never runs in the browser.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flagFor } from "./flags";
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
    upsetBonusCurrent: number;
    boldnessCount: number;
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
  const { matches } = data;

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
  const [poolSize, setPoolSize] = useState(20);

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

  // Decided real results: matchId → winner team id, for matches whose fixture is complete.
  // These are locked and override predictions; everything else stays editable.
  const decided = useMemo(() => {
    const m = new Map<string, number>();
    for (const mt of matches) if (mt.winner) m.set(mt.id, mt.winner.teamId);
    return m;
  }, [matches]);

  // Overlay decided winners onto a set of picks (decided wins), clearing any downstream
  // pick they contradict — the "effective" bracket the UI renders and the model sees.
  const overlay = useCallback(
    (p: Picks): Picks => {
      if (decided.size === 0) return p;
      const next: Picks = { ...p };
      for (const mt of matches) {
        const w = decided.get(mt.id);
        if (w === undefined || next[mt.id] === w) continue;
        next[mt.id] = w;
        let cur = childByFeeder.get(mt.id);
        while (cur) {
          const [x, y] = participantsOf(cur, next);
          const picked = next[cur];
          if (picked !== undefined && picked !== x && picked !== y) {
            delete next[cur];
            cur = childByFeeder.get(cur);
          } else break;
        }
      }
      return next;
    },
    [decided, matches, childByFeeder, participantsOf],
  );

  const onPick = useCallback(
    (matchId: string, teamId: number) => {
      if (decided.has(matchId)) return; // a decided match is locked to its real winner
      setPicks((prev) => {
        const [a, b] = participantsOf(matchId, overlay(prev));
        if (teamId !== a && teamId !== b) return prev;
        const next: Picks = { ...prev, [matchId]: teamId };
        // Cascade: clear downstream picks no longer reachable (over the effective bracket).
        let cur = childByFeeder.get(matchId);
        while (cur) {
          const [x, y] = participantsOf(cur, overlay(next));
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
    [decided, overlay, participantsOf, childByFeeder, persist],
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

  // Effective bracket = the user's picks with decided real results overlaid (decided wins).
  // Everything downstream (rendering, evaluation, chat context, export) uses this.
  const effective = useMemo(() => overlay(picks), [overlay, picks]);
  const effectiveEntries = useMemo(
    () => Object.entries(effective).map(([m, t]) => [m, t] as [string, number]),
    [effective],
  );

  // Debounced server evaluation whenever the effective bracket changes.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (effectiveEntries.length === 0) {
      setEvaluation(null);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/predictor/evaluate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ picks: effectiveEntries }),
        });
        if (res.ok) setEvaluation((await res.json()) as Evaluation);
      } catch {
        /* leave previous evaluation in place */
      }
    }, 450);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [effectiveEntries]);

  const pickInfo = useMemo(() => {
    const m = new Map<string, PickInfo>();
    for (const p of evaluation?.comparison.picks ?? []) m.set(p.matchId, p);
    return m;
  }, [evaluation]);

  // Report the current bracket context up so the shell's shared chat can send it.
  useEffect(() => {
    onContextChange?.({ picks: effectiveEntries, poolSize });
  }, [effectiveEntries, poolSize, onContextChange]);

  const filled = Object.keys(effective).length;

  const nameOf = useCallback((id: number | null) => (id !== null ? teamById.get(id)?.name ?? "TBD" : "TBD"), [teamById]);

  /** Ordered [round, matchup, pick] rows for the picks the user has made. */
  const pickedRows = useCallback((): { round: string; matchup: string; pick: string }[] => {
    const ordered = matches.slice().sort((a, b) => a.matchNumber - b.matchNumber);
    const rows: { round: string; matchup: string; pick: string }[] = [];
    for (const m of ordered) {
      const teamId = effective[m.id];
      if (teamId === undefined) continue;
      const [a, b] = participantsOf(m.id, effective);
      rows.push({ round: STAGE_LABEL[m.stage], matchup: `${nameOf(a)} vs ${nameOf(b)}`, pick: nameOf(teamId) });
    }
    return rows;
  }, [matches, effective, participantsOf, nameOf]);

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
    const champ = effective["M104"] ? teamById.get(effective["M104"])?.name ?? "" : "";
    if (champ) rows.push(["Champion", "", champ]);
    triggerDownload(new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }), "my-bracket.csv");
  }, [pickedRows, effective, teamById]);

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
          picks={effectiveEntries}
          total={matches.length}
          poolSize={poolSize}
          onPoolSize={setPoolSize}
          locked={false}
          onReset={reset}
          onGenerate={applyGenerated}
        />
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Lock &amp; export</p>
          <p className="mb-3 mt-1 text-[11px] text-slate-400">Happy with it? Take your picks to your pool.</p>
          <button
            onClick={downloadCsv}
            disabled={filled === 0}
            className="w-full rounded-lg border border-white/15 px-2 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-300/60 disabled:opacity-40"
          >
            ⬇ CSV
          </button>
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
                    participants={participantsOf(m.id, effective)}
                    teamById={teamById}
                    pickedId={effective[m.id] ?? null}
                    info={pickInfo.get(m.id) ?? null}
                    locked={decided.has(m.id)}
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
        <p className="mb-1 text-[10px] font-semibold text-orange-400" title="The model rates this close — chance of an upset">
          💥 chance of upset
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
                {slot.winProb !== undefined ? pct(slot.winProb) : picked && info ? pct(info.headToHead) : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
