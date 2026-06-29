// Ingest World Football Elo ratings (eloratings.net) → committed lib/data/ratings.json.
// Offline step: run `node scripts/ingest-elo.mjs` to refresh. The running app never
// fetches eloratings.net; it reads the committed snapshot. Zero deps (Node 20+).
//
// Source files (undocumented TSVs):
//   World.tsv       rank \t rank \t CODE \t ELO \t ...   (current ratings)
//   en.teams.tsv    CODE \t name [\t alt names...]       (code → country names)
// FIFA squads.json gives our 48 teams (id 1–48, name, abbr).
// The pure mapping lives in ../lib/data/eloMap.mjs (unit-tested separately).

import { writeFileSync } from "node:fs";
import { mapEloRatings } from "../lib/data/eloMap.mjs";

const ELO_BASE = "https://www.eloratings.net";
const FIFA_SQUADS = "https://play.fifa.com/json/fantasy/squads.json";

async function text(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Fetch failed ${url}: HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const [worldTsv, teamsTsv, squadsRaw] = await Promise.all([
    text(`${ELO_BASE}/World.tsv`),
    text(`${ELO_BASE}/en.teams.tsv`),
    fetch(FIFA_SQUADS, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.json()),
  ]);

  const squads = Array.isArray(squadsRaw) ? squadsRaw : squadsRaw.squads ?? Object.values(squadsRaw)[0];
  if (!Array.isArray(squads) || squads.length === 0) throw new Error("Unexpected squads.json shape");

  const { ratings, missing, suspect } = mapEloRatings({ worldTsv, teamsTsv, squads });

  if (missing.length > 0) {
    console.error(`Unmapped teams (${missing.length}):\n  ${missing.join("\n  ")}`);
    throw new Error("Refusing to write a partial ratings snapshot — fix the override table.");
  }
  if (suspect.length > 0) {
    console.error(`Out-of-range ratings (likely mis-mapped): ${suspect.join(", ")}`);
    throw new Error("Refusing to write — a rating is outside the plausible range; check the override table.");
  }

  const out = { asOf: new Date().toISOString().slice(0, 10), source: "eloratings.net", ratings };
  writeFileSync(new URL("../lib/data/ratings.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${Object.keys(ratings).length} ratings → lib/data/ratings.json (asOf ${out.asOf})`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
