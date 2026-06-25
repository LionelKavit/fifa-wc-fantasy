// POST /api/chat — ask the Scout. Accepts { question, history? }, streams the
// answer as plain text. Falls back to the deterministic grounded answer when no
// ANTHROPIC_API_KEY is configured. The key is read server-side only.
import { getTournamentData } from "../../../lib/server/tournament";
import { streamScout, type ConversationTurn } from "../../../lib/scout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isTurn(v: unknown): v is ConversationTurn {
  const t = v as ConversationTurn;
  return !!t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = (body ?? {}) as { question?: unknown; history?: unknown };
  const question = typeof data.question === "string" ? data.question.trim() : "";
  if (!question) {
    return Response.json({ error: "'question' is required" }, { status: 400 });
  }
  const history: ConversationTurn[] = Array.isArray(data.history) ? data.history.filter(isTurn) : [];

  const { snapshot, report } = await getTournamentData();

  // Source is determined by key presence, which is the same signal streamScout
  // uses to pick its path — so it is known before streaming begins.
  const source = process.env.ANTHROPIC_API_KEY ? "llm" : "deterministic";

  const encoder = new TextEncoder();
  const answer = streamScout(question, { snapshot, report, history });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of answer) controller.enqueue(encoder.encode(chunk));
      } catch (err) {
        controller.enqueue(encoder.encode(`\n[error: ${(err as Error).message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-scout-source": source,
      "cache-control": "no-store",
    },
  });
}
