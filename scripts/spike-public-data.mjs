// Spike: fetch the public FIFA WC 2026 Fantasy endpoints, normalize to typed-ish
// models, and dump a sanity report. Zero deps — runs on Node 18+ (`node scripts/spike-public-data.mjs`).
//
// Findings baked in from investigation (June 2026):
//   - The brief's `squads_fifa.json` is NOT the join key for players. It holds only
//     32 teams in a large id space (43817+) with zero overlap with player.squadId.
//   - `squads.json` (48 teams, id space 1–48) is the real bridge AND carries
//     `isEliminated` — the field the knockout optimizer needs most.
//   - `rounds.json` already embeds full fixtures (tournaments[]) keyed by the 1–48
//     squad id space, so the openfootball fallback is unnecessary for scheduling.

const BASE = "https://play.fifa.com/json/fantasy";

const ENDPOINTS = {
  players: `${BASE}/players.json`,
  rounds: `${BASE}/rounds.json`,
  squads: `${BASE}/squads.json`,        // the real team join (1–48)
  squadsFifa: `${BASE}/squads_fifa.json`, // secondary/partial (32 teams, big ids)
};

async function getJson(url) {
  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "pocket-scout-wc-spike" },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

// ---- light validation: assert the shape we depend on, fail loud on drift ----
function assert(cond, msg) {
  if (!cond) throw new Error(`VALIDATION: ${msg}`);
}

function validatePlayers(players) {
  assert(Array.isArray(players) && players.length > 0, "players not a non-empty array");
  const p = players[0];
  for (const k of ["id", "squadId", "position", "price", "status", "stats"]) {
    assert(k in p, `player missing key '${k}'`);
  }
  assert(["GK", "DEF", "MID", "FWD"].includes(p.position), `unexpected position '${p.position}'`);
}

function validateSquads(squads) {
  assert(Array.isArray(squads) && squads.length === 48, `expected 48 squads, got ${squads?.length}`);
  for (const k of ["id", "name", "abbr", "group", "isEliminated"]) {
    assert(k in squads[0], `squad missing key '${k}'`);
  }
}

function validateRounds(rounds) {
  assert(Array.isArray(rounds) && rounds.length > 0, "rounds not a non-empty array");
  assert("tournaments" in rounds[0], "round missing 'tournaments' (fixtures)");
}

// ---- normalization: join players -> team via squads.json ----
function normalize({ players, rounds, squads }) {
  const teamById = new Map(squads.map((s) => [s.id, s]));
  const normPlayers = players.map((p) => {
    const team = teamById.get(p.squadId);
    return {
      id: p.id,
      name: p.knownName || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim(),
      position: p.position,
      price: p.price,
      status: p.status,
      ownership: p.percentSelected,
      form: p.stats?.form ?? 0,
      totalPoints: p.stats?.totalPoints ?? 0,
      teamId: p.squadId,
      teamName: team?.name ?? "(UNMAPPED)",
      teamAbbr: team?.abbr ?? "???",
      teamGroup: team?.group ?? null,
      teamEliminated: team?.isEliminated ?? null,
    };
  });
  const normRounds = rounds.map((r) => ({
    id: r.id,
    status: r.status,
    stage: r.stage,
    startDate: r.startDate,
    endDate: r.endDate,
    fixtureCount: Array.isArray(r.tournaments) ? r.tournaments.length : 0,
  }));
  return { normPlayers, normRounds };
}

function dist(arr, keyFn) {
  const m = new Map();
  for (const x of arr) m.set(keyFn(x), (m.get(keyFn(x)) ?? 0) + 1);
  return Object.fromEntries([...m.entries()].sort());
}

function bar(n, max, width = 28) {
  return "█".repeat(Math.max(1, Math.round((n / max) * width)));
}

async function main() {
  console.log("Fetching public endpoints…\n");
  const [players, rounds, squads, squadsFifa] = await Promise.all([
    getJson(ENDPOINTS.players),
    getJson(ENDPOINTS.rounds),
    getJson(ENDPOINTS.squads),
    getJson(ENDPOINTS.squadsFifa),
  ]);

  validatePlayers(players);
  validateSquads(squads);
  validateRounds(rounds);

  const { normPlayers, normRounds } = normalize({ players, rounds, squads });

  console.log("════════════════════════ SANITY REPORT ════════════════════════\n");

  console.log(`Players: ${players.length}   Teams (squads.json): ${squads.length}   Rounds: ${rounds.length}`);
  const unmapped = normPlayers.filter((p) => p.teamName === "(UNMAPPED)").length;
  console.log(`Player→team join via squads.json: ${players.length - unmapped}/${players.length} mapped` +
    (unmapped ? `  ⚠️ ${unmapped} unmapped` : "  ✓ all mapped"));

  // The brief's named file, shown to be the wrong join key.
  const fifaIds = new Set(squadsFifa.map((s) => s.id));
  const overlap = normPlayers.filter((p) => fifaIds.has(p.teamId)).length;
  console.log(`squads_fifa.json: ${squadsFifa.length} teams, id-space overlap with player.squadId = ${overlap} (→ not the bridge)\n`);

  console.log("Positions:");
  const posD = dist(normPlayers, (p) => p.position);
  const posMax = Math.max(...Object.values(posD));
  for (const [k, v] of Object.entries(posD)) console.log(`  ${k.padEnd(4)} ${String(v).padStart(4)} ${bar(v, posMax)}`);

  console.log("\nPrice buckets:");
  const priceBuckets = dist(normPlayers, (p) => `${Math.floor(p.price)}.0–${Math.floor(p.price)}.9`);
  const prMax = Math.max(...Object.values(priceBuckets));
  for (const [k, v] of Object.entries(priceBuckets)) console.log(`  ${k.padEnd(9)} ${String(v).padStart(4)} ${bar(v, prMax)}`);

  console.log("\nStatus:");
  for (const [k, v] of Object.entries(dist(normPlayers, (p) => p.status))) console.log(`  ${k.padEnd(12)} ${v}`);

  console.log("\nRounds (note: tournaments[] = fixtures, no external schedule needed):");
  for (const r of normRounds) {
    console.log(`  R${String(r.id).padEnd(2)} ${String(r.stage).padEnd(6)} ${String(r.status).padEnd(10)} ${r.fixtureCount} fixtures   ${r.startDate?.slice(0, 10)}`);
  }

  console.log("\nElimination state (knockout-optimizer input):");
  const eliminated = squads.filter((s) => s.isEliminated);
  console.log(`  ${eliminated.length}/48 teams eliminated` +
    (eliminated.length ? `: ${eliminated.map((s) => s.abbr).join(", ")}` : " (group stage ongoing)"));

  console.log("\n✓ Spike complete — public data layer verified.");
}

main().catch((e) => {
  console.error("\n✗ Spike failed:", e.message);
  process.exit(1);
});
