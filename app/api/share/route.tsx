// GET /api/share?p=<encoded picks> — a shareable bracket card (PNG). Figures come
// from the same evaluation the predictor shows, so the card can't disagree with it.
// Original styling only; no FIFA imagery.
import { ImageResponse } from "next/og";
import { decodePrediction } from "../../../lib/predictionCode";
import { cardSummary, type CardSummary } from "../../../lib/server/predictor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ fontSize: 64, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 22, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 2 }}>{label}</div>
    </div>
  );
}

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("p") ?? "";
  let summary: CardSummary | null = null;
  try {
    summary = await cardSummary(decodePrediction(code));
  } catch {
    summary = null;
  }

  const champion = summary?.champion ?? "—";
  const runnerUp = summary?.runnerUp ?? null;
  const finalFour = summary?.finalFour ?? [];
  const projected = summary ? String(summary.projectedScore) : "—";
  const alive = summary ? `${Math.round(summary.stillAlive * 100)}%` : "—";
  const bold = summary ? String(summary.boldness) : "—";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "radial-gradient(120% 120% at 50% 0%, #15203a 0%, #0a0f1d 60%, #080c17 100%)",
          padding: 56,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 34 }}>🏆</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#eaeefb" }}>My World Cup 2026 Bracket</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f6c640" }}>You vs. the Model</div>
        </div>

        {/* Champion hero */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 24, letterSpacing: 4, color: "#a7b2c9" }}>CHAMPION</div>
          <div style={{ fontSize: 132, fontWeight: 900, color: "#f6c640", lineHeight: 1 }}>{champion}</div>
          {runnerUp ? (
            <div style={{ fontSize: 22, color: "#a7b2c9" }}>{`over ${runnerUp} in the final`}</div>
          ) : (
            <div style={{ fontSize: 22, color: "#a7b2c9" }}>pick your champion</div>
          )}
        </div>

        {/* Final Four chips */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 18, letterSpacing: 3, color: "#6b7689" }}>FINAL FOUR</div>
          <div style={{ display: "flex", gap: 12 }}>
            {(finalFour.length > 0 ? finalFour : ["—", "—", "—", "—"]).map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#eaeefb",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(31,157,107,0.5)",
                  borderRadius: 12,
                  padding: "8px 20px",
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Stat strip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 56 }}>
            <Stat label="Projected" value={projected} color="#f6c640" />
            <Stat label="Still alive" value={alive} color="#2dd4bf" />
            <Stat label="Upsets" value={bold} color="#fb923c" />
          </div>
          <div style={{ fontSize: 20, color: "#6b7689" }}>FIFA World Cup 2026 Bracket Agent</div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
