import { supabase } from "@/lib/supabase";

export type MarketAnalysisRecommendation =
  | "strong_buy"
  | "buy"
  | "watch"
  | "avoid"
  | "insufficient_data";

export type MarketAnalysisComparable = {
  title: string;
  price: number | null;
  mileage: number | null;
  location: string | null;
  url: string | null;
  source: string;
};

export type MarketAnalysisResult = {
  id: string;
  status: "completed" | "limited";

  marketValueLow: number | null;
  marketValueHigh: number | null;
  marketValueEstimate: number | null;

  asIsValueLow: number | null;
  asIsValueHigh: number | null;
  asIsValueEstimate: number | null;

  confidenceScore: number;
  visionUsed: boolean;
  visionConfidenceScore: number;
  imageCountAnalyzed: number;
  visibleDamage: string[];
  hiddenDamageRisks: string[];

  repairRisk: "low" | "medium" | "high" | "unknown";
  riskScore: number;

  repairCostLow: number | null;
  repairCostHigh: number | null;
  repairCostEstimate: number | null;
  repairCostUsed: number;

  desiredProfit: number;
  auctionFees: number;
  transportCost: number;

  profytScore: number | null;
  recommendedBid: number | null;
  recommendation: MarketAnalysisRecommendation;

  summary: string;
  keyFactors: string[];
  warnings: string[];

  comparableVehicles: MarketAnalysisComparable[];

  searchSourceCount: number;
  modelName: string;
};

type MarketAnalysisResponse =
  | {
      ok: true;
      analysis: MarketAnalysisResult;
    }
  | {
      ok: false;
      error: string;
    };

export async function runMarketAnalysis(
  vehicleId: string
): Promise<MarketAnalysisResult> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session?.access_token) {
    throw new Error(
      "Your login session has expired. Please sign in again."
    );
  }

  const response = await fetch("/api/market-analysis", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },

    body: JSON.stringify({
      vehicleId,
    }),
  });

  let payload: MarketAnalysisResponse;

  try {
    payload =
      (await response.json()) as MarketAnalysisResponse;
  } catch {
    throw new Error(
      "The market analysis server returned an invalid response."
    );
  }

  if (!response.ok || !payload.ok) {
    const errorMessage =
      "error" in payload
        ? payload.error
        : "Market analysis failed.";

    throw new Error(errorMessage);
  }

  return payload.analysis;
}

