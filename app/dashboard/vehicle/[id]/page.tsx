"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import AppNav from "@/components/AppNav";
import VehicleAnalysisImageUploader from "@/components/VehicleAnalysisImageUploader";
import { supabase } from "@/lib/supabase";

import {
  analyzeVehicleUrl,
  type AuctionAnalysis,
} from "@/lib/analyze-vehicle-client";

import { runMarketAnalysis } from "@/lib/market-analysis-client";

type AnalysisStatus = "success" | "limited" | "pending";

type Vehicle = {
  id: string;
  user_id: string;

  auction_url: string;
  image_url: string | null;
  auction_images: string[] | null;

  source: string | null;
  lot_number: string | null;
  title: string | null;

  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;

  location: string | null;
  state_code: string | null;
  title_status: string | null;

  analysis_status: AnalysisStatus | null;
  analysis_warnings: string[] | null;
  analyzed_at: string | null;

  auction_page_title: string | null;
  auction_description: string | null;

  mileage: number | null;
  mileage_unit: string | null;

  primary_damage: string | null;
  secondary_damage: string | null;
  run_condition: string | null;

  profyt_score: number | null;
  recommended_bid: number | null;

  retail_price: number | null;
  market_value: number | null;

  estimated_fees: number | null;
  estimated_transport: number | null;
  estimated_repairs: number | null;

  desired_profit: number | null;
  target_profit: number | null;

  is_won: boolean;
  is_sold: boolean;

  created_at: string;
};

type Note = {
  id: string;
  user_id: string;
  vehicle_id: string;
  content: string;
  created_at: string;
};

type MarketComparable = {
  title: string;
  price: number | null;
  mileage: number | null;
  location: string | null;
  url: string | null;
  source: string;
};

type MarketSearchSource = {
  url: string;
  title: string | null;
  type: string | null;
};

type MarketAnalysisRow = {
  id: string;
  status: "pending" | "completed" | "limited" | "failed";

  market_value_low: number | null;
  market_value_high: number | null;
  market_value_estimate: number | null;

  as_is_value_low: number | null;
  as_is_value_high: number | null;
  as_is_value_estimate: number | null;

  confidence_score: number | null;
  vision_used: boolean | null;
  image_count_analyzed: number | null;
  visible_damage: string[] | null;
  hidden_damage_risks: string[] | null;

  repair_risk: "low" | "medium" | "high" | "unknown" | null;
  risk_score: number | null;

  visible_repair_cost_low: number | null;
  visible_repair_cost_high: number | null;
  visible_repair_cost_estimate: number | null;

  hidden_damage_contingency_low: number | null;
  hidden_damage_contingency_high: number | null;
  hidden_damage_contingency_estimate: number | null;

  repair_cost_low: number | null;
  repair_cost_high: number | null;
  repair_cost_estimate: number | null;

  vision_detected_mileage: number | null;
  vision_detected_mileage_unit: "miles" | "km" | "unknown" | null;
  mileage_mismatch: boolean | null;

  profyt_score: number | null;
  recommended_bid: number | null;

  recommendation:
    | "strong_buy"
    | "buy"
    | "watch"
    | "avoid"
    | "insufficient_data"
    | null;

  summary: string | null;
  key_factors: string[] | null;
  warnings: string[] | null;

  comparable_vehicles: MarketComparable[] | null;
  search_sources: MarketSearchSource[] | null;

  model_name: string | null;
  created_at: string;
};

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();

  const rawVehicleId = params.id;
  const vehicleId = Array.isArray(rawVehicleId)
    ? rawVehicleId[0]
    : rawVehicleId;

  const [userId, setUserId] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [marketAnalysis, setMarketAnalysis] =
    useState<MarketAnalysisRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingNumbers, setSavingNumbers] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [runningMarketAnalysis, setRunningMarketAnalysis] =
    useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState(false);

  const [pageMessage, setPageMessage] = useState("");
  const [pageMessageIsError, setPageMessageIsError] =
    useState(false);

  const [infoMessage, setInfoMessage] = useState("");
  const [infoMessageIsError, setInfoMessageIsError] =
    useState(false);

  const [numbersMessage, setNumbersMessage] = useState("");
  const [numbersMessageIsError, setNumbersMessageIsError] =
    useState(false);

  const [noteMessage, setNoteMessage] = useState("");
  const [noteMessageIsError, setNoteMessageIsError] =
    useState(false);

  const [noteText, setNoteText] = useState("");

  const [titleInput, setTitleInput] = useState("");
  const [titleStatusInput, setTitleStatusInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [stateCodeInput, setStateCodeInput] = useState("");
  const [sourceInput, setSourceInput] = useState("");
  const [lotNumberInput, setLotNumberInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");

  const [mileageInput, setMileageInput] = useState("");
  const [mileageUnitInput, setMileageUnitInput] =
    useState("miles");

  const [primaryDamageInput, setPrimaryDamageInput] =
    useState("");

  const [secondaryDamageInput, setSecondaryDamageInput] =
    useState("");

  const [runConditionInput, setRunConditionInput] = useState("");

  const [retailPriceInput, setRetailPriceInput] = useState("");
  const [desiredProfitInput, setDesiredProfitInput] =
    useState("");

  const [repairsInput, setRepairsInput] = useState("");
  const [transportInput, setTransportInput] = useState("");
  const [feesInput, setFeesInput] = useState("");

  useEffect(() => {
    if (vehicleId) {
      loadPage();
    }
  }, [vehicleId]);

  const galleryImages = useMemo(() => {
    if (!vehicle) {
      return [];
    }

    return Array.from(
      new Set(
        [
          vehicle.image_url,
          ...(vehicle.auction_images ?? []),
        ].filter(
          (image): image is string =>
            typeof image === "string" && image.trim().length > 0
        )
      )
    );
  }, [vehicle]);

  async function loadPage() {
    if (!vehicleId) {
      setPageMessage("Vehicle ID is missing.");
      setPageMessageIsError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageMessage("");
    setPageMessageIsError(false);

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      router.push("/login");
      return;
    }

    setUserId(authData.user.id);

    const [
      vehicleResponse,
      notesResponse,
      marketAnalysisResponse,
    ] = await Promise.all([
      supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .eq("user_id", authData.user.id)
        .maybeSingle(),

      supabase
        .from("vehicle_notes")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("vehicle_market_analyses")
        .select(
          [
            "id",
            "status",
            "market_value_low",
            "market_value_high",
            "market_value_estimate",
            "as_is_value_low",
            "as_is_value_high",
            "as_is_value_estimate",
            "confidence_score",
            "vision_used",
            "image_count_analyzed",
            "visible_damage",
            "hidden_damage_risks",
            "repair_risk",
            "risk_score",
            "visible_repair_cost_low",
            "visible_repair_cost_high",
            "visible_repair_cost_estimate",
            "hidden_damage_contingency_low",
            "hidden_damage_contingency_high",
            "hidden_damage_contingency_estimate",
            "repair_cost_low",
            "repair_cost_high",
            "repair_cost_estimate",
            "vision_detected_mileage",
            "vision_detected_mileage_unit",
            "mileage_mismatch",
            "profyt_score",
            "recommended_bid",
            "recommendation",
            "summary",
            "key_factors",
            "warnings",
            "comparable_vehicles",
            "search_sources",
            "model_name",
            "created_at",
          ].join(",")
        )
        .eq("vehicle_id", vehicleId)
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (vehicleResponse.error) {
      setPageMessage(vehicleResponse.error.message);
      setPageMessageIsError(true);
      setLoading(false);
      return;
    }

    if (!vehicleResponse.data) {
      setPageMessage("Vehicle could not be found.");
      setPageMessageIsError(true);
      setLoading(false);
      return;
    }

    if (notesResponse.error) {
      setPageMessage(notesResponse.error.message);
      setPageMessageIsError(true);
    }

    if (marketAnalysisResponse.error) {
      setPageMessage(marketAnalysisResponse.error.message);
      setPageMessageIsError(true);
    }

    const loadedVehicle = vehicleResponse.data as Vehicle;

    setVehicle(loadedVehicle);
    setNotes((notesResponse.data || []) as Note[]);
    setMarketAnalysis(
      (marketAnalysisResponse.data as MarketAnalysisRow | null) ??
        null
    );

    setTitleInput(loadedVehicle.title ?? "");
    setTitleStatusInput(loadedVehicle.title_status ?? "");
    setLocationInput(loadedVehicle.location ?? "");
    setStateCodeInput(loadedVehicle.state_code ?? "");
    setSourceInput(loadedVehicle.source ?? "");
    setLotNumberInput(loadedVehicle.lot_number ?? "");
    setImageUrlInput(loadedVehicle.image_url ?? "");

    setMileageInput(
      loadedVehicle.mileage !== null &&
        loadedVehicle.mileage !== undefined
        ? String(loadedVehicle.mileage)
        : ""
    );

    setMileageUnitInput(
      loadedVehicle.mileage_unit || "miles"
    );

    setPrimaryDamageInput(
      loadedVehicle.primary_damage ?? ""
    );

    setSecondaryDamageInput(
      loadedVehicle.secondary_damage ?? ""
    );

    setRunConditionInput(
      loadedVehicle.run_condition ?? ""
    );

    const retailValue =
      loadedVehicle.retail_price ??
      loadedVehicle.market_value ??
      null;

    setRetailPriceInput(
      retailValue !== null ? String(retailValue) : ""
    );

    const profitValue =
      loadedVehicle.desired_profit ??
      loadedVehicle.target_profit ??
      null;

    setDesiredProfitInput(
      profitValue !== null ? String(profitValue) : ""
    );

    setRepairsInput(
      loadedVehicle.estimated_repairs !== null
        ? String(loadedVehicle.estimated_repairs)
        : ""
    );

    setTransportInput(
      loadedVehicle.estimated_transport !== null
        ? String(loadedVehicle.estimated_transport)
        : ""
    );

    setFeesInput(
      loadedVehicle.estimated_fees !== null
        ? String(loadedVehicle.estimated_fees)
        : ""
    );

    setLoading(false);
  }

  function toNumber(value: string) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  function numberOrNull(value: string) {
    const cleaned = value.trim();

    if (!cleaned) {
      return null;
    }

    const parsed = Number(cleaned);

    return Number.isFinite(parsed) ? parsed : null;
  }

  function nullIfEmpty(value: string) {
    const cleaned = value.trim();

    return cleaned.length > 0 ? cleaned : null;
  }

  function money(value: number | null | undefined) {
    if (value === null || value === undefined) {
      return "-";
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return "-";
    }

    return `$${parsed.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function calculateRecommendedBid(): number | null {
    const retailPrice = numberOrNull(retailPriceInput);

    if (retailPrice === null) {
      return null;
    }

    const desiredProfit = toNumber(desiredProfitInput);
    const repairs = toNumber(repairsInput);
    const transport = toNumber(transportInput);
    const fees = toNumber(feesInput);

    return (
      retailPrice -
      desiredProfit -
      repairs -
      transport -
      fees
    );
  }

  async function saveVehicleInfo() {
    if (!vehicle || !userId) {
      return;
    }

    setInfoMessage("");
    setInfoMessageIsError(false);
    setSavingInfo(true);

    const mileage = numberOrNull(mileageInput);

    if (mileage !== null && mileage < 0) {
      setInfoMessage("Mileage cannot be negative.");
      setInfoMessageIsError(true);
      setSavingInfo(false);
      return;
    }

    const stateCode = nullIfEmpty(stateCodeInput);

    if (stateCode && stateCode.length !== 2) {
      setInfoMessage(
        "State must use a two-letter code, for example MD."
      );

      setInfoMessageIsError(true);
      setSavingInfo(false);
      return;
    }

    const { error } = await supabase
      .from("vehicles")
      .update({
        title: nullIfEmpty(titleInput) || "Saved Vehicle",

        title_status: nullIfEmpty(titleStatusInput),

        location: nullIfEmpty(locationInput),

        state_code: stateCode
          ? stateCode.toUpperCase()
          : null,

        source: nullIfEmpty(sourceInput)?.toLowerCase() ?? null,

        lot_number: nullIfEmpty(lotNumberInput),

        image_url: nullIfEmpty(imageUrlInput),

        mileage,

        mileage_unit:
          mileage !== null
            ? nullIfEmpty(mileageUnitInput) || "miles"
            : null,

        primary_damage: nullIfEmpty(primaryDamageInput),

        secondary_damage: nullIfEmpty(
          secondaryDamageInput
        ),

        run_condition: nullIfEmpty(runConditionInput),
      })
      .eq("id", vehicleId)
      .eq("user_id", userId);

    setSavingInfo(false);

    if (error) {
      setInfoMessage(error.message);
      setInfoMessageIsError(true);
      return;
    }

    setInfoMessage("Vehicle and auction data saved.");
    await loadPage();
  }

  async function saveNumbers() {
    if (!vehicle || !userId) {
      return;
    }

    setNumbersMessage("");
    setNumbersMessageIsError(false);

    const retailPrice = numberOrNull(retailPriceInput);
    const desiredProfit = toNumber(desiredProfitInput);
    const repairs = toNumber(repairsInput);
    const transport = toNumber(transportInput);
    const fees = toNumber(feesInput);

    const valuesToValidate = [
      retailPrice,
      desiredProfit,
      repairs,
      transport,
      fees,
    ];

    if (
      valuesToValidate.some(
        (value) => value !== null && value < 0
      )
    ) {
      setNumbersMessage(
        "Financial values cannot be negative."
      );

      setNumbersMessageIsError(true);
      return;
    }

    const recommendedBid = calculateRecommendedBid();

    setSavingNumbers(true);

    const { error } = await supabase
      .from("vehicles")
      .update({
        retail_price: retailPrice,

        desired_profit: desiredProfit,
        target_profit: desiredProfit,

        estimated_repairs: repairs,
        estimated_transport: transport,
        estimated_fees: fees,

        recommended_bid: recommendedBid,
      })
      .eq("id", vehicleId)
      .eq("user_id", userId);

    setSavingNumbers(false);

    if (error) {
      setNumbersMessage(error.message);
      setNumbersMessageIsError(true);
      return;
    }

    setNumbersMessage("Profit assumptions saved.");
    await loadPage();
  }

  async function reanalyzeVehicle() {
    if (!vehicle || !userId) {
      return;
    }

    setPageMessage("");
    setPageMessageIsError(false);
    setReanalyzing(true);

    let analysis: AuctionAnalysis;

    try {
      analysis = await analyzeVehicleUrl(
        vehicle.auction_url
      );
    } catch (error) {
      setReanalyzing(false);
      setPageMessageIsError(true);

      setPageMessage(
        error instanceof Error
          ? error.message
          : "The vehicle could not be re-analyzed."
      );

      return;
    }

    const currentImages = vehicle.auction_images ?? [];

    const newImages =
      analysis.images.length > 0
        ? analysis.images
        : currentImages;

    const { error } = await supabase
      .from("vehicles")
      .update({
        title: analysis.title || vehicle.title,

        source: analysis.source || vehicle.source,
        lot_number:
          analysis.lotNumber ?? vehicle.lot_number,

        vehicle_year:
          analysis.vehicleYear ?? vehicle.vehicle_year,

        vehicle_make:
          analysis.vehicleMake ?? vehicle.vehicle_make,

        vehicle_model:
          analysis.vehicleModel ?? vehicle.vehicle_model,

        title_status:
          analysis.titleStatus ?? vehicle.title_status,

        location:
          analysis.location ?? vehicle.location,

        state_code:
          analysis.stateCode ?? vehicle.state_code,

        mileage:
          vehicle.mileage ?? analysis.mileage?.value ?? null,

        mileage_unit:
          vehicle.mileage_unit ?? analysis.mileage?.unit ?? null,

        primary_damage:
          analysis.primaryDamage ??
          vehicle.primary_damage,

        secondary_damage:
          analysis.secondaryDamage ??
          vehicle.secondary_damage,

        run_condition:
          analysis.runCondition ??
          vehicle.run_condition,

        image_url:
          analysis.imageUrl ?? vehicle.image_url,

        auction_images: newImages,

        analysis_status: analysis.analysisStatus,
        analysis_warnings: analysis.warnings,

        auction_page_title: analysis.pageTitle,

        auction_description: analysis.description,

        analyzed_at: analysis.analyzedAt,
      })
      .eq("id", vehicleId)
      .eq("user_id", userId);

    setReanalyzing(false);

    if (error) {
      setPageMessage(error.message);
      setPageMessageIsError(true);
      return;
    }

    if (analysis.analysisStatus === "limited") {
      setPageMessage(
        "Vehicle re-analyzed with limited auction data."
      );
    } else {
      setPageMessage(
        "Auction data refreshed successfully."
      );
    }

    await loadPage();
  }

  async function runAiMarketAnalysis() {
    if (!vehicle || !vehicleId) {
      return;
    }

    setPageMessage("");
    setPageMessageIsError(false);
    setRunningMarketAnalysis(true);

    try {
      const result = await runMarketAnalysis(vehicleId);

      await loadPage();

      setPageMessage(
        result.status === "completed"
          ? "AI market analysis completed successfully."
          : "AI market analysis completed with limited market data."
      );
      setPageMessageIsError(false);
    } catch (error) {
      setPageMessage(
        error instanceof Error
          ? error.message
          : "AI market analysis failed."
      );
      setPageMessageIsError(true);
    } finally {
      setRunningMarketAnalysis(false);
    }
  }

  async function addNote() {
    setNoteMessage("");
    setNoteMessageIsError(false);

    if (!noteText.trim()) {
      setNoteMessage("Note cannot be empty.");
      setNoteMessageIsError(true);
      return;
    }

    if (!userId) {
      setNoteMessage("User account could not be loaded.");
      setNoteMessageIsError(true);
      return;
    }

    setAddingNote(true);

    const { error } = await supabase
      .from("vehicle_notes")
      .insert({
        vehicle_id: vehicleId,
        user_id: userId,
        content: noteText.trim(),
      });

    setAddingNote(false);

    if (error) {
      setNoteMessage(error.message);
      setNoteMessageIsError(true);
      return;
    }

    setNoteText("");
    setNoteMessage("Note added.");

    await loadPage();
  }

  async function deleteNote(noteId: string) {
    if (!userId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this note?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("vehicle_notes")
      .delete()
      .eq("id", noteId)
      .eq("vehicle_id", vehicleId)
      .eq("user_id", userId);

    if (error) {
      setNoteMessage(error.message);
      setNoteMessageIsError(true);
      return;
    }

    setNoteMessage("Note deleted.");
    setNoteMessageIsError(false);

    await loadPage();
  }

  async function deleteVehicle() {
    if (!vehicle || !userId) {
      return;
    }

    if (vehicle.is_won || vehicle.is_sold) {
      setPageMessage(
        "Owned or sold vehicles cannot be deleted from the watchlist detail page."
      );

      setPageMessageIsError(true);
      return;
    }

    const confirmed = window.confirm(
      `Delete ${
        vehicle.title || "this vehicle"
      } from your watchlist?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingVehicle(true);

    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", vehicleId)
      .eq("user_id", userId)
      .eq("is_won", false);

    setDeletingVehicle(false);

    if (error) {
      setPageMessage(error.message);
      setPageMessageIsError(true);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-white">
        Loading vehicle analysis...
      </main>
    );
  }

  if (!vehicle) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <AppNav />

        <section className="mx-auto max-w-6xl px-6 py-10">
          <StatusMessage
            message={
              pageMessage || "Vehicle could not be found."
            }
            isError
          />

          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-lg border border-zinc-700 px-5 py-3"
          >
            Back to Watchlist
          </Link>
        </section>
      </main>
    );
  }

  const calculatedBid = calculateRecommendedBid();


  const backHref = vehicle.is_sold
    ? "/sold"
    : vehicle.is_won
      ? "/inventory"
      : "/dashboard";

  const backLabel = vehicle.is_sold
    ? "Back to Sold Vehicles"
    : vehicle.is_won
      ? "Back to Inventory"
      : "Back to Watchlist";

  const recordStatus = vehicle.is_sold
    ? "Sold Vehicle"
    : vehicle.is_won
      ? "Current Inventory"
      : "Auction Watchlist";

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <AppNav />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-green-500">
              Vehicle Analysis
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              {vehicle.title || "Saved Vehicle"}
            </h1>
          </div>

          <Link
            href={backHref}
            className="w-fit rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500"
          >
            {backLabel}
          </Link>
        </div>

        {pageMessage && (
          <div className="mt-6">
            <StatusMessage
              message={pageMessage}
              isError={pageMessageIsError}
            />
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={recordStatus}
                variant="neutral"
              />

              {vehicle.title_status && (
                <StatusBadge
                  label={vehicle.title_status}
                  variant="green"
                />
              )}

              {vehicle.analysis_status === "success" && (
                <StatusBadge
                  label="Auction Data Captured"
                  variant="blue"
                />
              )}

              {vehicle.analysis_status === "limited" && (
                <StatusBadge
                  label="Limited Data"
                  variant="amber"
                />
              )}

              {!vehicle.analysis_status && (
                <StatusBadge
                  label="Analysis Pending"
                  variant="neutral"
                />
              )}
            </div>

            <div className="mt-6 space-y-2 text-zinc-400">
              {vehicle.location && (
                <p>
                  {vehicle.location}
                  {vehicle.state_code
                    ? `, ${vehicle.state_code}`
                    : ""}
                </p>
              )}

              {vehicle.lot_number && (
                <p>Lot #{vehicle.lot_number}</p>
              )}

              <p>
                Source:{" "}
                <span className="capitalize">
                  {vehicle.source || "unknown"}
                </span>
              </p>

              <p>
                Last analyzed:{" "}
                {vehicle.analyzed_at
                  ? new Date(
                      vehicle.analyzed_at
                    ).toLocaleString()
                  : "Not analyzed"}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={vehicle.auction_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-green-500 px-5 py-3 font-semibold text-black"
              >
                Open Auction Link
              </a>

              <button
                onClick={reanalyzeVehicle}
                disabled={reanalyzing}
                className="rounded-lg border border-zinc-700 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reanalyzing
                  ? "Analyzing..."
                  : "Re-analyze Auction Data"}
              </button>

              {!vehicle.is_won && !vehicle.is_sold && (
                <button
                  onClick={deleteVehicle}
                  disabled={deletingVehicle}
                  className="rounded-lg border border-red-900 px-5 py-3 text-red-400 disabled:opacity-60"
                >
                  {deletingVehicle
                    ? "Deleting..."
                    : "Delete Vehicle"}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            {vehicle.image_url ? (
              <img
                src={vehicle.image_url}
                alt={vehicle.title || "Vehicle image"}
                className="h-full min-h-80 w-full object-cover"
              />
            ) : (
              <div className="flex min-h-80 items-center justify-center p-6 text-center text-zinc-500">
                No auction image is currently available.
                <br />
                Add an image URL or re-analyze the vehicle.
              </div>
            )}
          </div>
        </div>

        {vehicle.analysis_warnings &&
          vehicle.analysis_warnings.length > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6">
              <h2 className="font-bold text-amber-400">
                Manual Review Required
              </h2>

              <div className="mt-3 space-y-2 text-sm text-amber-300/80">
                {vehicle.analysis_warnings.map(
                  (warning, index) => (
                    <p key={`${warning}-${index}`}>
                      • {warning}
                    </p>
                  )
                )}
              </div>
            </div>
          )}

        <VehicleAnalysisImageUploader
          vehicleId={vehicle.id}
          userId={userId}
        />

        <div className="mt-8 rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 via-zinc-900 to-zinc-900 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">
                  AI Market Analysis
                </h2>

                {marketAnalysis && (
                  <>
                    <StatusBadge
                      label={
                        marketAnalysis.status === "completed"
                          ? "Completed"
                          : marketAnalysis.status === "limited"
                            ? "Limited"
                            : marketAnalysis.status === "failed"
                              ? "Failed"
                              : "Pending"
                      }
                      variant={
                        marketAnalysis.status === "completed"
                          ? "green"
                          : marketAnalysis.status === "limited"
                            ? "amber"
                            : "neutral"
                      }
                    />

                    {marketAnalysis.recommendation && (
                      <RecommendationBadge
                        recommendation={
                          marketAnalysis.recommendation
                        }
                      />
                    )}
                  </>
                )}
              </div>

              <p className="mt-2 max-w-3xl text-zinc-400">
                Search current US listings, estimate repaired resale
                value, inspect available auction photos, measure repair
                risk and calculate a data-backed maximum bid.
              </p>

              {marketAnalysis && (
                <p className="mt-3 text-xs text-zinc-500">
                  Last AI analysis:{" "}
                  {new Date(
                    marketAnalysis.created_at
                  ).toLocaleString()}
                  {marketAnalysis.model_name
                    ? ` · ${marketAnalysis.model_name}`
                    : ""}
                </p>
              )}
            </div>

            <button
              onClick={runAiMarketAnalysis}
              disabled={runningMarketAnalysis}
              className="w-fit rounded-lg bg-green-500 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningMarketAnalysis
                ? "Analyzing Vehicle..."
                : marketAnalysis
                  ? "Re-run Full AI Analysis"
                  : "Run Full AI Analysis"}
            </button>
          </div>

          {!marketAnalysis ? (
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
              <p className="font-semibold text-zinc-200">
                No AI market analysis has been run yet.
              </p>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Complete missing mileage, damage and run-condition
                fields first for a stronger estimate. Profytly will not
                invent unavailable vehicle information.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <AiMetric
                  label="Repaired Resale Value"
                  value={money(
                    marketAnalysis.market_value_estimate
                  )}
                  note={
                    marketAnalysis.market_value_low !== null &&
                    marketAnalysis.market_value_high !== null
                      ? `${money(
                          marketAnalysis.market_value_low
                        )} – ${money(
                          marketAnalysis.market_value_high
                        )} estimated range`
                      : "Reliable range unavailable"
                  }
                  highlight
                />

                <AiMetric
                  label="AI Recommended Max Bid"
                  value={money(
                    marketAnalysis.recommended_bid
                  )}
                  note="Includes profit, fees, transport and repair assumptions"
                  highlight
                />

                <AiMetric
                  label="Profyt Score"
                  value={
                    marketAnalysis.profyt_score !== null
                      ? `${marketAnalysis.profyt_score}/100`
                      : "Pending"
                  }
                  note="Opportunity score based on confidence, risk and margin"
                />

                <AiMetric
                  label="Confidence"
                  value={
                    marketAnalysis.confidence_score !== null
                      ? `${marketAnalysis.confidence_score}%`
                      : "-"
                  }
                  note="Strength of current comparable-market evidence"
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <AiMetric
                  label="Repair Risk"
                  value={formatRepairRisk(
                    marketAnalysis.repair_risk
                  )}
                  note={
                    marketAnalysis.risk_score !== null
                      ? `Risk score ${marketAnalysis.risk_score}/100`
                      : "Risk score unavailable"
                  }
                />

                <AiMetric
                  label="Visible Repair Cost"
                  value={money(
                    marketAnalysis.visible_repair_cost_estimate
                  )}
                  note={
                    marketAnalysis.visible_repair_cost_low !== null &&
                    marketAnalysis.visible_repair_cost_high !== null
                      ? `${money(
                          marketAnalysis.visible_repair_cost_low
                        )} – ${money(
                          marketAnalysis.visible_repair_cost_high
                        )} flipper-cost range`
                      : "Visible repair estimate unavailable"
                  }
                />

                <AiMetric
                  label="Hidden Damage Contingency"
                  value={money(
                    marketAnalysis.hidden_damage_contingency_estimate
                  )}
                  note={
                    marketAnalysis.hidden_damage_contingency_low !== null &&
                    marketAnalysis.hidden_damage_contingency_high !== null
                      ? `${money(
                          marketAnalysis.hidden_damage_contingency_low
                        )} – ${money(
                          marketAnalysis.hidden_damage_contingency_high
                        )} risk allowance`
                      : "No separate contingency estimate"
                  }
                />

                <AiMetric
                  label="Recommended Repair Budget"
                  value={money(
                    marketAnalysis.repair_cost_estimate
                  )}
                  note={
                    marketAnalysis.repair_cost_low !== null &&
                    marketAnalysis.repair_cost_high !== null
                      ? `${money(
                          marketAnalysis.repair_cost_low
                        )} – ${money(
                          marketAnalysis.repair_cost_high
                        )} total range`
                      : "Fallback budget may be used"
                  }
                  highlight
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <AiMetric
                  label="Estimated As-Is Value"
                  value={money(
                    marketAnalysis.as_is_value_estimate
                  )}
                  note={
                    marketAnalysis.as_is_value_low !== null &&
                    marketAnalysis.as_is_value_high !== null
                      ? `${money(
                          marketAnalysis.as_is_value_low
                        )} – ${money(
                          marketAnalysis.as_is_value_high
                        )} estimated range`
                      : "Current-condition value unavailable"
                  }
                />

                <AiMetric
                  label="Vision Evidence"
                  value={
                    marketAnalysis.vision_used
                      ? `${marketAnalysis.image_count_analyzed ?? 0} images`
                      : "Not available"
                  }
                  note={
                    marketAnalysis.vision_used
                      ? "Auction photos were included in damage analysis"
                      : "Repair estimate was not visually verified"
                  }
                />

                <AiMetric
                  label="Mileage"
                  value={
                    vehicle.mileage !== null
                      ? `${Number(vehicle.mileage).toLocaleString()} ${
                          vehicle.mileage_unit === "km" ? "km" : "miles"
                        }`
                      : marketAnalysis.vision_detected_mileage !== null
                        ? `${Number(
                            marketAnalysis.vision_detected_mileage
                          ).toLocaleString()} ${
                            marketAnalysis.vision_detected_mileage_unit === "km"
                              ? "km"
                              : "miles"
                          }`
                        : "Not available"
                  }
                  note={
                    vehicle.mileage !== null &&
                    marketAnalysis.vision_detected_mileage !== null &&
                    Number(vehicle.mileage) ===
                      Number(marketAnalysis.vision_detected_mileage)
                      ? "Detected automatically from the odometer photo"
                      : vehicle.mileage !== null
                        ? "Manual mileage value"
                        : "Mileage could not be verified from the supplied photos"
                  }
                />
              </div>

              <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-wider text-green-500">
                  Analyst Summary
                </p>

                <p className="mt-3 whitespace-pre-wrap leading-7 text-zinc-300">
                  {marketAnalysis.summary ||
                    "No written AI summary was returned."}
                </p>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <AnalysisList
                  title="Key Factors"
                  items={marketAnalysis.key_factors ?? []}
                  emptyText="No key factors were returned."
                  variant="neutral"
                />

                <AnalysisList
                  title="AI Warnings"
                  items={marketAnalysis.warnings ?? []}
                  emptyText="No additional AI warnings."
                  variant="warning"
                />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <AnalysisList
                  title="Visible Damage"
                  items={marketAnalysis.visible_damage ?? []}
                  emptyText={
                    marketAnalysis.vision_used
                      ? "No visible damage items were returned."
                      : "Auction photos were not available for vision analysis."
                  }
                  variant="neutral"
                />

                <AnalysisList
                  title="Hidden Damage Risks"
                  items={marketAnalysis.hidden_damage_risks ?? []}
                  emptyText="No additional hidden-damage risks were returned."
                  variant="warning"
                />
              </div>

              {marketAnalysis.comparable_vehicles &&
                marketAnalysis.comparable_vehicles.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-bold">
                      Comparable Vehicles
                    </h3>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      {marketAnalysis.comparable_vehicles.map(
                        (comparable, index) => (
                          <div
                            key={`${comparable.url || comparable.title}-${index}`}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5"
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-semibold text-zinc-100">
                                  {comparable.title}
                                </p>

                                <p className="mt-1 text-sm capitalize text-zinc-500">
                                  {comparable.source}
                                  {comparable.location
                                    ? ` · ${comparable.location}`
                                    : ""}
                                </p>
                              </div>

                              <p className="text-xl font-bold text-green-500">
                                {money(comparable.price)}
                              </p>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                              <span>
                                Mileage:{" "}
                                {comparable.mileage !== null
                                  ? comparable.mileage.toLocaleString()
                                  : "Not listed"}
                              </span>

                              {comparable.url && (
                                <a
                                  href={comparable.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-green-400 hover:text-green-300"
                                >
                                  Open Listing
                                </a>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {marketAnalysis.search_sources &&
                marketAnalysis.search_sources.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-bold">
                      Research Sources
                    </h3>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {marketAnalysis.search_sources.map(
                        (source, index) => (
                          <a
                            key={`${source.url}-${index}`}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 transition hover:border-zinc-600"
                          >
                            <p className="line-clamp-2 font-semibold text-zinc-200">
                              {source.title ||
                                new URL(source.url).hostname}
                            </p>

                            <p className="mt-2 truncate text-xs text-zinc-500">
                              {source.url}
                            </p>
                          </a>
                        )
                      )}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Mileage"
            value={
              vehicle.mileage !== null
                ? `${Number(
                    vehicle.mileage
                  ).toLocaleString()} ${
                    vehicle.mileage_unit || ""
                  }`
                : "Not available"
            }
          />

          <Metric
            label="Primary Damage"
            value={
              vehicle.primary_damage || "Not available"
            }
          />

          <Metric
            label="Secondary Damage"
            value={
              vehicle.secondary_damage || "Not available"
            }
          />

          <Metric
            label="Run Condition"
            value={
              vehicle.run_condition || "Not available"
            }
          />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="text-sm text-zinc-400">
              Profyt Score
            </div>

            <div className="mt-4 text-4xl font-bold">
              {vehicle.profyt_score !== null
                ? vehicle.profyt_score
                : "Pending"}

              {vehicle.profyt_score !== null && (
                <span className="text-lg text-zinc-500">
                  /100
                </span>
              )}
            </div>
          </div>

          <Metric
            label="Expected Retail Price"
            value={money(numberOrNull(retailPriceInput))}
          />

          <Metric
            label="Desired Profit"
            value={money(toNumber(desiredProfitInput))}
          />

          <Metric
            label="Recommended Max Bid"
            value={money(calculatedBid)}
            highlight={calculatedBid !== null}
          />
        </div>

        {galleryImages.length > 1 && (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Auction Images
                </h2>

                <p className="mt-2 text-zinc-400">
                  Images captured from the auction listing.
                </p>
              </div>

              <p className="text-sm text-zinc-500">
                {galleryImages.length} images
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleryImages.map((image, index) => (
                <a
                  key={image}
                  href={image}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
                >
                  <img
                    src={image}
                    alt={`${vehicle.title || "Vehicle"} image ${
                      index + 1
                    }`}
                    className="h-52 w-full object-cover transition hover:scale-105"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">
            Edit Vehicle and Auction Data
          </h2>

          <p className="mt-2 text-zinc-400">
            Correct information that was missing or unavailable from
            the auction listing.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TextField
              label="Vehicle Title"
              value={titleInput}
              onChange={setTitleInput}
              placeholder="2016 Kia Sorento LX"
            />

            <TextField
              label="Title Status"
              value={titleStatusInput}
              onChange={setTitleStatusInput}
              placeholder="Clean Title"
            />

            <TextField
              label="Location"
              value={locationInput}
              onChange={setLocationInput}
              placeholder="Baltimore East"
            />

            <TextField
              label="State"
              value={stateCodeInput}
              onChange={(value) =>
                setStateCodeInput(
                  value.toUpperCase().slice(0, 2)
                )
              }
              placeholder="MD"
              maxLength={2}
            />

            <TextField
              label="Source"
              value={sourceInput}
              onChange={setSourceInput}
              placeholder="copart"
            />

            <TextField
              label="Lot Number"
              value={lotNumberInput}
              onChange={setLotNumberInput}
              placeholder="85739455"
            />

            <NumberField
              label="Mileage"
              value={mileageInput}
              onChange={setMileageInput}
              showCurrency={false}
            />

            <SelectField
              label="Mileage Unit"
              value={mileageUnitInput}
              onChange={setMileageUnitInput}
              options={[
                { value: "miles", label: "Miles" },
                { value: "km", label: "Kilometers" },
                { value: "unknown", label: "Unknown" },
              ]}
            />

            <TextField
              label="Run Condition"
              value={runConditionInput}
              onChange={setRunConditionInput}
              placeholder="Run and Drive"
            />

            <TextField
              label="Primary Damage"
              value={primaryDamageInput}
              onChange={setPrimaryDamageInput}
              placeholder="Front End"
            />

            <TextField
              label="Secondary Damage"
              value={secondaryDamageInput}
              onChange={setSecondaryDamageInput}
              placeholder="Minor Dent / Scratches"
            />

            <div className="md:col-span-2 xl:col-span-3">
              <TextField
                label="Primary Vehicle Image URL"
                value={imageUrlInput}
                onChange={setImageUrlInput}
                placeholder="https://example.com/vehicle-image.jpg"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={saveVehicleInfo}
              disabled={savingInfo}
              className="rounded-lg bg-green-500 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingInfo
                ? "Saving..."
                : "Save Vehicle Data"}
            </button>

            {infoMessage && (
              <StatusMessage
                message={infoMessage}
                isError={infoMessageIsError}
              />
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">
            Edit Profit Assumptions
          </h2>

          <p className="mt-2 text-zinc-400">
            Use the AI estimate as a starting point or enter your own
            expected resale value. Manual assumptions recalculate the
            working maximum bid instantly without deleting the saved AI
            market analysis.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <NumberField
              label="Retail Price"
              value={retailPriceInput}
              onChange={setRetailPriceInput}
            />

            <NumberField
              label="Desired Profit"
              value={desiredProfitInput}
              onChange={setDesiredProfitInput}
            />

            <NumberField
              label="Repairs"
              value={repairsInput}
              onChange={setRepairsInput}
            />

            <NumberField
              label="Transport"
              value={transportInput}
              onChange={setTransportInput}
            />

            <NumberField
              label="Auction Fees"
              value={feesInput}
              onChange={setFeesInput}
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <FormulaItem
              label="Retail Price"
              value={money(numberOrNull(retailPriceInput))}
            />

            <FormulaItem
              label="Desired Profit"
              value={`- ${money(
                toNumber(desiredProfitInput)
              )}`}
            />

            <FormulaItem
              label="Repairs"
              value={`- ${money(toNumber(repairsInput))}`}
            />

            <FormulaItem
              label="Transport"
              value={`- ${money(toNumber(transportInput))}`}
            />

            <FormulaItem
              label="Auction Fees"
              value={`- ${money(toNumber(feesInput))}`}
            />
          </div>

          <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">
              Recommended Max Bid
            </p>

            <p className="mt-2 text-4xl font-bold text-green-500">
              {money(calculatedBid)}
            </p>

            {calculatedBid === null && (
              <p className="mt-2 text-sm text-zinc-500">
                Enter a retail price to calculate the maximum bid.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={saveNumbers}
              disabled={savingNumbers}
              className="rounded-lg bg-green-500 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingNumbers
                ? "Saving..."
                : "Save Profit Assumptions"}
            </button>

            {numbersMessage && (
              <StatusMessage
                message={numbersMessage}
                isError={numbersMessageIsError}
              />
            )}
          </div>
        </div>

        {(vehicle.auction_page_title ||
          vehicle.auction_description) && (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold">
              Auction Page Metadata
            </h2>

            {vehicle.auction_page_title && (
              <div className="mt-5">
                <p className="text-sm text-zinc-500">
                  Page Title
                </p>

                <p className="mt-2 text-zinc-200">
                  {vehicle.auction_page_title}
                </p>
              </div>
            )}

            {vehicle.auction_description && (
              <div className="mt-5">
                <p className="text-sm text-zinc-500">
                  Description
                </p>

                <p className="mt-2 leading-7 text-zinc-300">
                  {vehicle.auction_description}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Notes</h2>

          <p className="mt-2 text-zinc-400">
            Save inspection reminders, bidding decisions and repair
            observations.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <textarea
              value={noteText}
              onChange={(event) =>
                setNoteText(event.target.value)
              }
              placeholder="Example: Check front bumper, verify keys and confirm transportation quote..."
              className="min-h-32 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-green-500"
            />

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={addNote}
                disabled={addingNote}
                className="w-fit rounded-lg bg-green-500 px-5 py-3 font-semibold text-black disabled:opacity-60"
              >
                {addingNote ? "Adding..." : "Add Note"}
              </button>

              {noteMessage && (
                <StatusMessage
                  message={noteMessage}
                  isError={noteMessageIsError}
                />
              )}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {notes.length === 0 ? (
              <p className="text-zinc-500">
                No notes have been added.
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="whitespace-pre-wrap text-zinc-200">
                        {note.content}
                      </p>

                      <p className="mt-3 text-xs text-zinc-500">
                        {new Date(
                          note.created_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteNote(note.id)}
                      className="w-fit text-sm text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function AiMetric({
  label,
  value,
  note,
  highlight = false,
}: {
  label: string;
  value: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5">
      <p className="text-sm text-zinc-400">{label}</p>

      <p
        className={`mt-3 break-words text-2xl font-bold ${
          highlight ? "text-green-500" : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-zinc-500">
        {note}
      </p>
    </div>
  );
}

function RecommendationBadge({
  recommendation,
}: {
  recommendation: NonNullable<
    MarketAnalysisRow["recommendation"]
  >;
}) {
  const labels = {
    strong_buy: "Strong Buy",
    buy: "Buy",
    watch: "Watch",
    avoid: "Avoid",
    insufficient_data: "Insufficient Data",
  };

  const styles = {
    strong_buy:
      "border-green-500/30 bg-green-500/15 text-green-400",
    buy:
      "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
    watch:
      "border-amber-500/30 bg-amber-500/15 text-amber-400",
    avoid:
      "border-red-500/30 bg-red-500/15 text-red-400",
    insufficient_data:
      "border-zinc-700 bg-zinc-950 text-zinc-300",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[recommendation]}`}
    >
      {labels[recommendation]}
    </span>
  );
}

function AnalysisList({
  title,
  items,
  emptyText,
  variant,
}: {
  title: string;
  items: string[];
  emptyText: string;
  variant: "neutral" | "warning";
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        variant === "warning"
          ? "border-amber-500/20 bg-amber-500/5"
          : "border-zinc-800 bg-zinc-950/70"
      }`}
    >
      <h3
        className={`font-bold ${
          variant === "warning"
            ? "text-amber-400"
            : "text-zinc-100"
        }`}
      >
        {title}
      </h3>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          {emptyText}
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <p
              key={`${item}-${index}`}
              className={`text-sm leading-6 ${
                variant === "warning"
                  ? "text-amber-200/80"
                  : "text-zinc-400"
              }`}
            >
              • {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRepairRisk(
  value: MarketAnalysisRow["repair_risk"]
) {
  if (!value || value === "unknown") {
    return "Unknown";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="text-sm text-zinc-400">{label}</p>

      <p
        className={`mt-4 break-words text-2xl font-bold ${
          highlight ? "text-green-500" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  label,
  variant,
}: {
  label: string;
  variant: "green" | "blue" | "amber" | "neutral";
}) {
  const styles = {
    green:
      "border-green-500/20 bg-green-500/10 text-green-400",
    blue:
      "border-blue-500/20 bg-blue-500/10 text-blue-400",
    amber:
      "border-amber-500/20 bg-amber-500/10 text-amber-400",
    neutral:
      "border-zinc-700 bg-zinc-950 text-zinc-300",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[variant]}`}
    >
      {label}
    </span>
  );
}

function StatusMessage({
  message,
  isError,
}: {
  message: string;
  isError: boolean;
}) {
  return (
    <p
      className={`text-sm ${
        isError ? "text-red-400" : "text-green-400"
      }`}
    >
      {message}
    </p>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400">
        {label}
      </label>

      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-green-500"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  showCurrency = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showCurrency?: boolean;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400">
        {label}
      </label>

      <div className="relative mt-2">
        {showCurrency && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            $
          </span>
        )}

        <input
          type="number"
          min="0"
          step={showCurrency ? "0.01" : "1"}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className={`w-full rounded-lg border border-zinc-700 bg-zinc-950 py-3 pr-4 text-white outline-none focus:border-green-500 ${
            showCurrency ? "pl-9" : "pl-4"
          }`}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-green-500"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormulaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>

      <p className="mt-1 font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

