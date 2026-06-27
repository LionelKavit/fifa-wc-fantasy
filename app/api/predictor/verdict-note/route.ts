// POST /api/predictor/verdict-note — body = the verdict facts (winProbability,
// chalkWinProbability, expectedFinish, poolSize, pointsRange). Returns { text, source }:
// an Analyst-written sentence when a key is configured, else the deterministic template.
// The Anthropic key is read only server-side.
import { verdictNote } from "../../../../lib/scout/verdict";
import type { VerdictFacts } from "../../../../lib/predictor/verdictText";
import { getTournamentData } from "../../../../lib/server/tournament";
import { loadKnowledge } from "../../../../lib/server/knowledge";
import { selectNotes, type KnowledgeSnippet } from "../../../../lib/knowledge/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Expert notes relevant to the bracket's notable team ids (champion/finalists), if any. */
async function notesForSubjects(subjects: unknown): Promise<KnowledgeSnippet[] | undefined> {
  if (!Array.isArray(subjects) || subjects.length === 0) return undefined;
  const all = loadKnowledge().snippets;
  if (all.length === 0) return undefined;
  const { snapshot } = await getTournamentData();
  const names = subjects
    .filter((id): id is number => typeof id === "number")
    .map((id) => snapshot.teams.find((t) => t.id === id)?.name)
    .filter((n): n is string => !!n);
  const picked: KnowledgeSnippet[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    for (const s of selectNotes(all, name, { max: 2 })) {
      const key = `${s.source}|${s.text}`;
      if (!seen.has(key)) {
        seen.add(key);
        picked.push(s);
      }
    }
  }
  return picked.length > 0 ? picked.slice(0, 4) : undefined;
}

function validFacts(b: unknown): b is VerdictFacts {
  if (!b || typeof b !== "object") return false;
  const f = b as Record<string, unknown>;
  const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  const pr = f.pointsRange as Record<string, unknown> | undefined;
  return (
    num(f.winProbability) &&
    num(f.chalkWinProbability) &&
    num(f.expectedFinish) &&
    num(f.poolSize) &&
    (f.poolSize as number) >= 1 &&
    !!pr &&
    num(pr.p10) &&
    num(pr.p90)
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!validFacts(body)) {
    return Response.json({ error: "Expected verdict facts { winProbability, chalkWinProbability, expectedFinish, poolSize, pointsRange }" }, { status: 400 });
  }

  try {
    const notes = await notesForSubjects((body as { subjects?: unknown }).subjects);
    const note = await verdictNote(body, { notes });
    return Response.json(note);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Verdict note failed" }, { status: 400 });
  }
}
