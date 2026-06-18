import { NextResponse } from "next/server";
import {
  analyzeAuctionUrl,
  AuctionUrlError,
} from "@/lib/auction-analyzer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "Profytly Auction Analyzer",
      supportedSources: ["copart", "iaai"],
      method: "POST",
      exampleBody: {
        url: "https://www.copart.com/lot/85739455/clean-title-2016-kia-sorento-lx-md-baltimore-east",
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "The request body must be valid JSON.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const url =
    typeof requestBody === "object" &&
    requestBody !== null &&
    "url" in requestBody
      ? (requestBody as { url?: unknown }).url
      : undefined;

  try {
    const analysis = await analyzeAuctionUrl(url);

    return NextResponse.json(
      {
        ok: true,
        analysis,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (error instanceof AuctionUrlError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        {
          status: error.statusCode,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    console.error(
      "Auction analyzer error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "The vehicle could not be analyzed due to an internal error.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}