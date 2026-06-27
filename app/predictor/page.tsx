// The predictor now lives in the unified tabbed app. Keep the old URL working by
// redirecting to the Knockouts tab.
import { redirect } from "next/navigation";

export default function PredictorPage() {
  redirect("/?tab=knockouts");
}
