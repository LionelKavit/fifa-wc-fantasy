// Server component: one group's standings — dark themed, labelled minimalist
// table with country flags and a single "Qualification chance" percentage.
import TeamButton from "./TeamButton";
import type { TeamResult } from "./teamResults";

export type Advancement = "clinched" | "contention" | "thirdPlaceRace" | "eliminated";

export interface TeamRow {
  teamId: number;
  abbr: string;
  name: string;
  rank: number;
  played: number;
  goalDifference: number;
  points: number;
  advancement: Advancement;
  advancementProbability: number | null;
  conditional: { win: number; draw: number; loss: number } | null;
  /** One-line qualifying-status description (grounded narration). */
  narration: string;
  /** Completed World Cup fixtures (full-time scores). */
  results: TeamResult[];
}

export interface GroupLive {
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
}

export interface GroupView {
  groupId: string;
  narration: string;
  teams: TeamRow[];
  /** In-progress fixtures in this group (for the live indicator). */
  liveFixtures?: GroupLive[];
}

// Shared column template keeps header + rows aligned. The team column has a real
// minimum width so the flag/code never bulges into the P column.
const COLS = "grid grid-cols-[1rem_minmax(4rem,1fr)_1.75rem_2.5rem_1.75rem_4rem] items-center gap-x-3";

const pct = (p: number) => `${Math.round(p * 100)}%`;
const gd = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Concise "who advanced" line, derived from the per-team advancement data. A team counts
 * as advanced when it is effectively certain to (clinched, or its next-round probability is
 * ~100% — which also captures a third-placed team through as a best third). */
function advancedSummary(group: GroupView): string {
  const G = group.groupId.toUpperCase();
  const advanced = group.teams.filter((t) => t.advancement === "clinched" || (t.advancementProbability ?? 0) >= 0.999);
  if (!advanced.length) return `Group ${G}: still being decided.`;
  const abbrs = advanced.map((t) => t.abbr);
  return `Group ${G}: ${joinList(abbrs)} ${abbrs.length === 1 ? "has" : "have"} advanced.`;
}

function qualClass(a: Advancement): string {
  if (a === "clinched") return "text-emerald-400";
  if (a === "eliminated") return "text-slate-600";
  return "text-slate-100";
}

export default function GroupCard({ group }: { group: GroupView }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111726]/80 p-5 shadow-lg shadow-black/20 transition hover:border-white/20">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">
          Group {group.groupId.toUpperCase()}
        </h2>
        {group.liveFixtures?.length ? (
          <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-[11px] font-semibold text-rose-400">
            {group.liveFixtures.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 tabular-nums">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" aria-hidden />
                LIVE {f.homeAbbr} {f.homeScore}–{f.awayScore} {f.awayAbbr}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* column headers */}
      <div className={`${COLS} pb-2 text-[10px] font-medium uppercase leading-tight tracking-wide text-slate-500`}>
        <span />
        <span>Team</span>
        <span className="text-right" title="Matches played">P</span>
        <span className="text-right">GD</span>
        <span className="text-right">Pts</span>
        <span className="text-right">Next Round</span>
      </div>

      <ul>
        {group.teams.map((t) => (
          <li key={t.teamId} className={`${COLS} border-t border-white/5 py-2.5`}>
            <span className="text-xs tabular-nums text-slate-600">{t.rank}</span>
            <TeamButton abbr={t.abbr} name={t.name} narration={t.narration} results={t.results} />
            <span className="text-right text-xs tabular-nums text-slate-400">{t.played}</span>
            <span className="text-right text-xs tabular-nums text-slate-400">{gd(t.goalDifference)}</span>
            <span className="text-right text-sm font-bold tabular-nums text-slate-100">{t.points}</span>
            <span
              className={`text-right text-sm font-semibold tabular-nums ${qualClass(t.advancement)}`}
              title={
                t.conditional
                  ? `If they win: ${pct(t.conditional.win)} · draw: ${pct(t.conditional.draw)} · lose: ${pct(t.conditional.loss)}`
                  : undefined
              }
            >
              {pct(t.advancementProbability ?? 0)}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">{advancedSummary(group)}</p>
    </section>
  );
}
