// Pure parsing + selection for knowledge sources. No file I/O — the server loader
// (lib/server/knowledge.ts) reads files and calls these; the scout tool imports the
// types + selectNotes without pulling fs into the engine/scout layers.

export interface KnowledgeSnippet {
  /** Source filename, for attribution. */
  source: string;
  heading?: string;
  text: string;
}

/** Lightweight structured hints for the deterministic generator. */
export interface KnowledgeSignals {
  favor: string[];
  fade: string[];
}

export interface ParsedSource {
  snippets: KnowledgeSnippet[];
  signals: KnowledgeSignals;
}

const SIGNAL_LINE = /^\s*(favor|fade)\s*:\s*(.+?)\s*$/i;

/** Parse one source file into prose snippets + favor/fade signals. Signal directive
 * lines (`favor:` / `fade:`) are pulled out of the prose. */
export function parseKnowledgeFile(source: string, text: string): ParsedSource {
  const favor: string[] = [];
  const fade: string[] = [];
  const proseLines: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const m = line.match(SIGNAL_LINE);
    if (m) {
      const teams = m[2]!.split(",").map((s) => s.trim()).filter(Boolean);
      (m[1]!.toLowerCase() === "favor" ? favor : fade).push(...teams);
    } else {
      proseLines.push(line);
    }
  }

  return { snippets: splitSnippets(source, proseLines.join("\n")), signals: { favor, fade } };
}

/** Split prose into snippets: one per markdown heading section, else per paragraph. */
function splitSnippets(source: string, text: string): KnowledgeSnippet[] {
  const out: KnowledgeSnippet[] = [];
  // Split before each markdown heading so each section is its own block.
  for (const block of text.split(/\n(?=#{1,6}\s)/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const heading = trimmed.match(/^#{1,6}\s+(.+)/);
    if (heading) {
      const body = trimmed.replace(/^#{1,6}\s+.+\n?/, "").trim();
      out.push({ source, heading: heading[1]!.trim(), text: body || heading[1]!.trim() });
    } else {
      for (const para of trimmed.split(/\n\s*\n/)) {
        const p = para.trim();
        if (p) out.push({ source, text: p });
      }
    }
  }
  return out;
}

/** Snippets relevant to a topic: case-insensitive term match over heading + text,
 * capped at `max`. An empty topic returns the first `max` (small-set fallback). */
export function selectNotes(snippets: KnowledgeSnippet[], topic: string, opts: { max?: number } = {}): KnowledgeSnippet[] {
  const max = opts.max ?? 5;
  const terms = topic.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  if (terms.length === 0) return snippets.slice(0, max);
  const matched = snippets.filter((s) => {
    const hay = `${s.heading ?? ""} ${s.text}`.toLowerCase();
    return terms.some((t) => hay.includes(t));
  });
  return matched.slice(0, max);
}
