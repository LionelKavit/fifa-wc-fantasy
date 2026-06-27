// Compact, stable URL encoding for a bracket prediction, shared by the predictor
// UI (build a share link) and the share-card route (decode it). Format: dot-joined
// "matchNumber-teamId" pairs, e.g. "73-2.75-21.104-7". Pure, no deps.

/** Encode picks (matchId → teamId entries) into a short URL-safe string. */
export function encodePrediction(picks: [string, number][]): string {
  return picks
    .map(([matchId, teamId]) => [Number(matchId.replace(/^M/, "")), teamId] as const)
    .filter(([num, teamId]) => Number.isFinite(num) && Number.isFinite(teamId))
    .sort((a, b) => a[0] - b[0])
    .map(([num, teamId]) => `${num}-${teamId}`)
    .join(".");
}

/** Decode a share string back into [matchId, teamId] pairs. Ignores malformed parts. */
export function decodePrediction(code: string): [string, number][] {
  if (!code) return [];
  const out: [string, number][] = [];
  for (const part of code.split(".")) {
    const [n, t] = part.split("-");
    if (!n || !t) continue;
    const num = Number(n);
    const teamId = Number(t);
    if (Number.isFinite(num) && Number.isFinite(teamId)) out.push([`M${num}`, teamId]);
  }
  return out;
}
