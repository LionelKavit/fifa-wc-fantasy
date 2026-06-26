// Bracket Predictor page. Server component: resolves the bracket + baseline odds
// from the cached provider and hands them to the client predictor island.
import { getBracketData } from "../../lib/server/predictor";
import BracketPredictor from "../components/BracketPredictor";

export const dynamic = "force-dynamic";

export default async function PredictorPage() {
  const data = await getBracketData();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mx-auto mb-6 h-1 w-24 rounded-full bg-gradient-to-r from-teal-400 via-amber-400 to-orange-500" />
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
          <span aria-hidden>🏆</span> Bracket Predictor{" "}
          <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-teal-300 bg-clip-text text-transparent">
            · You vs. the Model
          </span>
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
          Fill in the knockout bracket. We&apos;ll score it against reality — and tell you how unlikely the model thinks
          it is.
        </p>
      </header>

      <BracketPredictor data={data} />
    </main>
  );
}
