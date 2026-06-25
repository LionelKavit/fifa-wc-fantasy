// Map a FIFA 3-letter team code to its country flag emoji. FIFA codes differ from
// ISO 3166-1 alpha-2, so we map explicitly, then build the flag from regional
// indicator symbols (or a subdivision tag sequence for England/Scotland/Wales).

const FIFA_TO_ISO: Record<string, string> = {
  ALG: "DZ", ARG: "AR", AUS: "AU", AUT: "AT", BEL: "BE", BIH: "BA", BRA: "BR", CAN: "CA",
  CIV: "CI", COD: "CD", COL: "CO", CPV: "CV", CRO: "HR", CUW: "CW", CZE: "CZ", ECU: "EC",
  EGY: "EG", ESP: "ES", FRA: "FR", GER: "DE", GHA: "GH", HAI: "HT", IRN: "IR", IRQ: "IQ",
  JOR: "JO", JPN: "JP", KOR: "KR", KSA: "SA", MAR: "MA", MEX: "MX", NED: "NL", NOR: "NO",
  NZL: "NZ", PAN: "PA", PAR: "PY", POR: "PT", QAT: "QA", RSA: "ZA", SEN: "SN", SUI: "CH",
  SWE: "SE", TUN: "TN", TUR: "TR", URU: "UY", USA: "US", UZB: "UZ",
};

const NEUTRAL = "🏳️";

function regionalIndicator(iso2: string): string {
  return String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

// e.g. "gbeng" → England's tag-sequence flag.
function subdivisionFlag(region: string): string {
  const tags = [...region].map((c) => String.fromCodePoint(0xe0000 + c.charCodeAt(0))).join("");
  return `\u{1F3F4}${tags}\u{E007F}`;
}

const SPECIAL: Record<string, string> = {
  ENG: subdivisionFlag("gbeng"),
  SCO: subdivisionFlag("gbsct"),
  WAL: subdivisionFlag("gbwls"),
};

/** Country flag emoji for a FIFA team code, or a neutral flag if unmapped. */
export function flagFor(abbr: string): string {
  const code = abbr.toUpperCase();
  if (SPECIAL[code]) return SPECIAL[code];
  const iso = FIFA_TO_ISO[code];
  return iso ? regionalIndicator(iso) : NEUTRAL;
}
