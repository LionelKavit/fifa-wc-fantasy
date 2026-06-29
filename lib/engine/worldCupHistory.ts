// World Cup history (1930–2022) — grounded, trusted historical facts for the Analyst.
//
// Loaded from the committed `lib/data/world-cup-history.json` (generated offline by
// `scripts/ingest-wc-history.py` from the RSSSF full match archives). Match results are
// parsed; tournament meta (champion/runner-up/host/final/Golden Boot) + the all-time
// top-scorer list are curated. Pure aggregations (records, head-to-head, scorers) computed
// here and cached. These are HISTORICAL facts only — they never feed WC2026 predictions,
// and they end at the 2022 World Cup (the in-progress 2026 tournament is NOT included; see
// `coverage`/`WC_HISTORY_COVERAGE`), so a through-2022 record is never the current record.

import historyData from "../data/world-cup-history.json";

export interface WcMatch {
  stage: string | null;
  a: string;
  b: string;
  sa: number | null;
  sb: number | null;
}
export interface WcGoldenBoot {
  player: string;
  team: string;
  goals: number;
  shared: boolean;
}
export interface WcTournament {
  year: number;
  host: string;
  champion: string;
  runnerUp: string;
  finalScore: string;
  goldenBoot: WcGoldenBoot;
  matches: WcMatch[];
}
export interface WcScorer {
  player: string;
  team: string;
  goals: number;
}
export interface WcHistory {
  source: string;
  attribution: string;
  generatedAt: string;
  coverage?: string;
  note: string;
  allTimeTopScorers: WcScorer[];
  tournaments: WcTournament[];
}

const HISTORY = historyData as WcHistory;

/** Merge only the widely-accepted successor; other former nations stay distinct. */
const MERGE_ALIAS: Record<string, string> = { "West Germany": "Germany" };
const canon = (t: string): string => MERGE_ALIAS[t] ?? t;

/** Nations as they appear after the accepted merge — the resolvable set. */
const NATIONS: string[] = (() => {
  const s = new Set<string>();
  for (const t of HISTORY.tournaments) {
    s.add(canon(t.champion));
    s.add(canon(t.runnerUp));
    for (const m of t.matches) {
      s.add(canon(m.a));
      s.add(canon(m.b));
    }
  }
  return [...s];
})();

/** Forgiving team-name resolution to a canonical nation (or null). */
const NAME_ALIAS: Record<string, string> = {
  ussr: "Soviet Union",
  "soviet union": "Soviet Union",
  russia: "Russia",
  holland: "Netherlands",
  "the netherlands": "Netherlands",
  korea: "South Korea",
  "korea republic": "South Korea",
  "north korea": "North Korea",
  "west germany": "Germany",
  "czech republic": "Czech Republic",
  czechia: "Czech Republic",
  czechoslovakia: "Czechoslovakia",
  "united states": "USA",
  us: "USA",
  yugoslavia: "Yugoslavia",
  "ivory coast": "Ivory Coast",
};
export function resolveNation(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const aliased = NAME_ALIAS[q];
  if (aliased) return canon(aliased);
  const exact = NATIONS.find((n) => n.toLowerCase() === q);
  if (exact) return exact;
  const partial = NATIONS.find((n) => n.toLowerCase().includes(q) || q.includes(n.toLowerCase()));
  return partial ?? null;
}

const STAGE_LABEL: Record<string, string> = {
  group: "group stage",
  R16: "Round of 16",
  QF: "quarter-final",
  SF: "semi-final",
  third: "third-place match",
  final: "final",
};
const STAGE_DEPTH: Record<string, number> = { final: 6, third: 4, SF: 4, QF: 3, R16: 2, group: 1 };
const BEST_FINISH = ["", "Group stage", "Round of 16", "Quarter-finalist", "Semi-finalist"];

export interface WcRecord {
  team: string;
  appearances: number;
  titles: number;
  finalsReached: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  bestFinish: string;
  note?: string;
}

/** A nation's all-time World Cup record (West Germany folded into Germany). */
export function teamRecord(query: string): WcRecord | null {
  const q = resolveNation(query);
  if (!q) return null;
  let played = 0,
    won = 0,
    drawn = 0,
    lost = 0,
    gf = 0,
    ga = 0,
    titles = 0,
    finalsReached = 0,
    deepest = 0;
  let spansWestGermany = false;
  const apps = new Set<number>();
  for (const t of HISTORY.tournaments) {
    let inTournament = false;
    for (const m of t.matches) {
      const ca = canon(m.a);
      const cb = canon(m.b);
      if (ca !== q && cb !== q) continue;
      inTournament = true;
      if (m.a === "West Germany" || m.b === "West Germany") spansWestGermany = q === "Germany" && true;
      if (m.stage) deepest = Math.max(deepest, STAGE_DEPTH[m.stage] ?? 0);
      if (m.sa === null || m.sb === null) continue; // walkover — counted as appearance only
      const me = ca === q ? m.sa : m.sb;
      const opp = ca === q ? m.sb : m.sa;
      played++;
      gf += me;
      ga += opp;
      if (me > opp) won++;
      else if (me === opp) drawn++;
      else lost++;
    }
    if (inTournament) apps.add(t.year);
    if (canon(t.champion) === q) titles++;
    if (canon(t.champion) === q || canon(t.runnerUp) === q) finalsReached++;
  }
  if (apps.size === 0) return null;
  const bestFinish = titles > 0 ? "Champion" : finalsReached > 0 ? "Runner-up" : BEST_FINISH[deepest > 4 ? 4 : deepest] ?? "Group stage";
  return {
    team: q,
    appearances: apps.size,
    titles,
    finalsReached,
    played,
    won,
    drawn,
    lost,
    goalsFor: gf,
    goalsAgainst: ga,
    bestFinish,
    note: spansWestGermany ? "Includes the West Germany era (1954–1990)." : undefined,
  };
}

export interface WcMeeting {
  year: number;
  stage: string;
  score: string;
  winner: string | "draw";
}
export interface WcHeadToHead {
  teamA: string;
  teamB: string;
  meetings: WcMeeting[];
  aWins: number;
  bWins: number;
  draws: number;
}

/** All World Cup meetings between two nations. */
export function headToHead(a: string, b: string): WcHeadToHead | null {
  const qa = resolveNation(a);
  const qb = resolveNation(b);
  if (!qa || !qb || qa === qb) return null;
  const meetings: WcMeeting[] = [];
  let aWins = 0,
    bWins = 0,
    draws = 0;
  for (const t of HISTORY.tournaments) {
    for (const m of t.matches) {
      const ca = canon(m.a);
      const cb = canon(m.b);
      if (!((ca === qa && cb === qb) || (ca === qb && cb === qa))) continue;
      if (m.sa === null || m.sb === null) continue;
      const aScore: number = ca === qa ? m.sa : m.sb;
      const bScore: number = ca === qa ? m.sb : m.sa;
      const winner: string = aScore > bScore ? qa : bScore > aScore ? qb : "draw";
      if (winner === qa) aWins++;
      else if (winner === qb) bWins++;
      else draws++;
      meetings.push({ year: t.year, stage: STAGE_LABEL[m.stage ?? ""] ?? (m.stage ?? "unknown"), score: `${aScore}-${bScore}`, winner });
    }
  }
  return { teamA: qa, teamB: qb, meetings, aWins, bWins, draws };
}

/** Golden Boot for a given year, or the all-time top scorers when no year is given. */
export function topScorers(year?: number): { year: number; goldenBoot: WcGoldenBoot } | { allTime: WcScorer[] } | null {
  if (year !== undefined) {
    const t = HISTORY.tournaments.find((x) => x.year === year);
    return t ? { year: t.year, goldenBoot: t.goldenBoot } : null;
  }
  return { allTime: HISTORY.allTimeTopScorers };
}

export interface WcChampion {
  year: number;
  host: string;
  champion: string;
  runnerUp: string;
  finalScore: string;
}
/** Every World Cup's champion (+ host, runner-up, final score), 1930–2022. */
export function champions(): WcChampion[] {
  return HISTORY.tournaments.map((t) => ({ year: t.year, host: t.host, champion: t.champion, runnerUp: t.runnerUp, finalScore: t.finalScore }));
}

/** Coverage of the history dataset — surfaced so answers never present a through-2022
 * record as if it were current (the in-progress tournament is not included). */
export const WC_HISTORY_COVERAGE =
  HISTORY.coverage ?? "Through the 2022 World Cup; does not include the in-progress tournament.";

export const historyMeta = { source: HISTORY.source, attribution: HISTORY.attribution, generatedAt: HISTORY.generatedAt, coverage: WC_HISTORY_COVERAGE, note: HISTORY.note };
