// Server-side knowledge loader: reads the repo's `knowledge/` directory and turns the
// source files into prose snippets + favor/fade signals. Optional and cached — an
// empty (or absent) directory yields nothing, so the app behaves exactly as before.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseKnowledgeFile, type KnowledgeSnippet, type KnowledgeSignals } from "../knowledge/parse";

export interface Knowledge {
  snippets: KnowledgeSnippet[];
  signals: KnowledgeSignals;
}

const TEXT_EXT = /\.(md|markdown|txt)$/i;

let dirOverride: string | null = null;
let cache: Knowledge | null = null;

function knowledgeDir(): string {
  return dirOverride ?? join(process.cwd(), "knowledge");
}

/** Load + parse the knowledge sources (cached). README and non-text files are skipped;
 * PDFs are skipped with a note until a parser is wired. */
export function loadKnowledge(): Knowledge {
  if (cache) return cache;

  const dir = knowledgeDir();
  const snippets: KnowledgeSnippet[] = [];
  const favor: string[] = [];
  const fade: string[] = [];

  try {
    if (existsSync(dir)) {
      for (const name of readdirSync(dir).sort()) {
        if (name.toLowerCase() === "readme.md") continue;
        if (/\.pdf$/i.test(name)) {
          console.warn(`[knowledge] PDF source skipped (add a parser to enable): ${name}`);
          continue;
        }
        if (!TEXT_EXT.test(name)) continue;
        const parsed = parseKnowledgeFile(name, readFileSync(join(dir, name), "utf8"));
        snippets.push(...parsed.snippets);
        favor.push(...parsed.signals.favor);
        fade.push(...parsed.signals.fade);
      }
    }
  } catch {
    /* knowledge is optional — treat any read error as "no sources" */
  }

  cache = { snippets, signals: { favor, fade } };
  return cache;
}

/** Test seam: point the loader at a fixtures dir (and reset the cache). */
export function __setKnowledgeDirForTests(dir: string | null): void {
  dirOverride = dir;
  cache = null;
}
/** Test seam: clear the cache. */
export function __resetKnowledgeCacheForTests(): void {
  cache = null;
}
