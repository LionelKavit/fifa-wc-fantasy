// Pure mapping for the Elo ratings ingestion — no network, no fs — so it can be
// unit-tested with fixtures. Shared by `scripts/ingest-elo.mjs`.

/** Our squad name (normalized) → eloratings.net 2-letter code, for names that don't
 * match the source directly. Codes are ISO-3166 alpha-2 as used by eloratings. */
export const CODE_OVERRIDES = {
  "cabo verde": "CV",
  "congo dr": "CD",
  "cote divoire": "CI",
  curacao: "CW",
  czechia: "CZ",
  england: "EN",
  "ir iran": "IR",
  "korea republic": "KR",
  scotland: "SQ",
  turkiye: "TR",
  usa: "US",
};

/** Plausible range for international men's Elo; outside this signals a mis-map. */
export const MIN_PLAUSIBLE_ELO = 1100;
export const MAX_PLAUSIBLE_ELO = 2300;

/** Normalize a country name for matching: strip accents/punctuation, lowercase. */
export function norm(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim();
}

/** Parse World.tsv (rank, rank, CODE, ELO, …) → { code: elo }. */
export function parseWorld(worldTsv) {
  const codeToElo = {};
  for (const line of worldTsv.split("\n")) {
    const c = line.split("\t");
    if (c.length < 4) continue;
    const elo = Number(c[3]);
    if (c[2] && Number.isFinite(elo)) codeToElo[c[2]] = elo;
  }
  return codeToElo;
}

/** Parse en.teams.tsv (CODE \t name [\t alt names…]) → { normalizedName: code }. */
export function parseTeams(teamsTsv) {
  const nameToCode = {};
  for (const line of teamsTsv.split("\n")) {
    const c = line.split("\t");
    if (c.length < 2) continue;
    for (const name of c.slice(1)) nameToCode[norm(name)] = c[0];
  }
  return nameToCode;
}

/**
 * Map our squads to Elo ratings from the two source TSVs.
 * @returns {{ ratings: Record<number, number>, missing: string[], suspect: string[] }}
 *   `missing` = teams with no rating; `suspect` = ratings outside the plausible range
 *   (a valid-but-wrong code the coverage check alone would not catch).
 */
export function mapEloRatings({ worldTsv, teamsTsv, squads }) {
  const codeToElo = parseWorld(worldTsv);
  const nameToCode = parseTeams(teamsTsv);
  const ratings = {};
  const missing = [];
  const suspect = [];
  for (const s of squads) {
    const key = norm(s.name);
    const code = CODE_OVERRIDES[key] ?? nameToCode[key];
    const elo = code ? codeToElo[code] : undefined;
    if (elo === undefined) {
      missing.push(`${s.id} ${s.name} (${s.abbr}) → code=${code ?? "?"}`);
      continue;
    }
    ratings[s.id] = elo;
    if (elo < MIN_PLAUSIBLE_ELO || elo > MAX_PLAUSIBLE_ELO) suspect.push(`${s.name} = ${elo} (code ${code})`);
  }
  return { ratings, missing, suspect };
}
