export type AuctionAnalysis = {
  source: "copart" | "iaai";
  auctionUrl: string;
  fetchedUrl: string;

  analysisStatus: "success" | "limited";
  fetched: boolean;

  lotNumber: string | null;
  title: string;
  vehicleYear: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;

  titleStatus: string | null;
  location: string | null;
  stateCode: string | null;

  mileage: {
    value: number;
    unit: "miles" | "km" | "unknown";
  } | null;

  primaryDamage: string | null;
  secondaryDamage: string | null;
  runCondition: string | null;

  imageUrl: string | null;
  images: string[];

  pageTitle: string | null;
  description: string | null;

  extractedBy: string[];
  warnings: string[];
  analyzedAt: string;
};

type AnalyzeVehicleResponse =
  | {
      ok: true;
      analysis: AuctionAnalysis;
    }
  | {
      ok: false;
      error: string;
    };

export async function analyzeVehicleUrl(
  auctionUrl: string
): Promise<AuctionAnalysis> {
  const response = await fetch("/api/analyze-vehicle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: auctionUrl,
    }),
  });

  let result: AnalyzeVehicleResponse;

  try {
    result = (await response.json()) as AnalyzeVehicleResponse;
  } catch {
    throw new Error(
      "The analyzer returned an invalid response."
    );
  }

  if (!response.ok || !result.ok) {
    throw new Error(
      result.ok
        ? "The vehicle could not be analyzed."
        : result.error
    );
  }

  return result.analysis;
}