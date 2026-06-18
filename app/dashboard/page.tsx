"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import AppNav from "@/components/AppNav";

import {
  analyzeVehicleUrl,
  type AuctionAnalysis,
} from "@/lib/analyze-vehicle-client";
import { runMarketAnalysis } from "@/lib/market-analysis-client";

type Vehicle = {
  id: string;
  user_id: string;

  auction_url: string;
  image_url: string | null;

  source: string | null;
  lot_number: string | null;
  title: string | null;

  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;

  location: string | null;
  state_code: string | null;
  title_status: string | null;

  profyt_score: number | null;

  retail_price: number | null;
  market_value: number | null;

  desired_profit: number | null;
  target_profit: number | null;

  recommended_bid: number | null;

  estimated_fees: number | null;
  estimated_transport: number | null;
  estimated_repairs: number | null;

  analysis_status: "success" | "limited" | "pending" | null;
  analysis_warnings: string[] | null;
  auction_images: string[] | null;

  mileage: number | null;
  mileage_unit: string | null;
  listing_mileage: number | null;
  listing_mileage_unit: string | null;
  listing_mileage_captured_at: string | null;

  primary_damage: string | null;
  secondary_damage: string | null;
  run_condition: string | null;

  auction_page_title: string | null;
  auction_description: string | null;
  analyzed_at: string | null;

  is_won: boolean;
  purchase_price: number | null;
  purchase_date: string | null;

  actual_auction_fees: number | null;
  actual_transport: number | null;
  actual_repairs: number | null;
  other_expenses: number | null;

  is_sold: boolean;
  sale_price: number | null;
  sale_date: string | null;
  selling_expenses: number | null;

  created_at: string;
};

type ProfileDefaults = {
  businessName: string;
  desiredProfit: number;
  auctionFees: number;
  transport: number;
  repairs: number;
};

const SYSTEM_DEFAULTS: ProfileDefaults = {
  businessName: "",
  desiredProfit: 1500,
  auctionFees: 875,
  transport: 300,
  repairs: 900,
};

export default function DashboardPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [auctionUrl, setAuctionUrl] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingVehicle, setSavingVehicle] = useState(false);

  const [profileDefaults, setProfileDefaults] =
    useState<ProfileDefaults>(SYSTEM_DEFAULTS);

  const [searchTerm, setSearchTerm] = useState("");
  const [titleFilter, setTitleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [selectedVehicleIds, setSelectedVehicleIds] = useState<
    string[]
  >([]);

  const [wonVehicleId, setWonVehicleId] = useState<string | null>(
    null
  );

  const [purchasePriceInput, setPurchasePriceInput] = useState("");
  const [purchaseDateInput, setPurchaseDateInput] = useState("");

  const [actualAuctionFeesInput, setActualAuctionFeesInput] =
    useState("");

  const [actualTransportInput, setActualTransportInput] =
    useState("");

  const [actualRepairsInput, setActualRepairsInput] = useState("");
  const [otherExpensesInput, setOtherExpensesInput] = useState("0");

  const [savingWonVehicle, setSavingWonVehicle] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState<
    string | null
  >(null);

  useEffect(() => {
    loadUserAndVehicles();
  }, []);

  async function loadUserAndVehicles() {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      router.push("/login");
      return;
    }

    setUserId(authData.user.id);
    setEmail(authData.user.email || "");

    const [vehicleResponse, profileResponse] = await Promise.all([
      supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", authData.user.id)
        .eq("is_won", false)
        .order("created_at", { ascending: false }),

      supabase
        .from("profiles")
        .select(
          `
            business_name,
            default_desired_profit,
            default_auction_fees,
            default_transport,
            default_repairs
          `
        )
        .eq("id", authData.user.id)
        .maybeSingle(),
    ]);

    if (vehicleResponse.error) {
      setMessage(vehicleResponse.error.message);
      setMessageIsError(true);
      setLoading(false);
      return;
    }

    if (profileResponse.error) {
      setMessage(profileResponse.error.message);
      setMessageIsError(true);
      setLoading(false);
      return;
    }

    const loadedVehicles = (vehicleResponse.data || []) as Vehicle[];
    const profile = profileResponse.data;

    setVehicles(loadedVehicles);

    setSelectedVehicleIds((current) =>
      current.filter((id) =>
        loadedVehicles.some((vehicle) => vehicle.id === id)
      )
    );

    setProfileDefaults({
      businessName: profile?.business_name ?? "",

      desiredProfit: Number(
        profile?.default_desired_profit ??
          SYSTEM_DEFAULTS.desiredProfit
      ),

      auctionFees: Number(
        profile?.default_auction_fees ??
          SYSTEM_DEFAULTS.auctionFees
      ),

      transport: Number(
        profile?.default_transport ?? SYSTEM_DEFAULTS.transport
      ),

      repairs: Number(
        profile?.default_repairs ?? SYSTEM_DEFAULTS.repairs
      ),
    });

    setLoading(false);
  }

  function toNumber(value: string) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  function nullableNumber(value: number | null | undefined) {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  function money(value: number | null | undefined) {
    const numericValue = nullableNumber(value);

    if (numericValue === null) {
      return "-";
    }

    return `$${numericValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function todayInputValue() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getRetailPrice(vehicle: Vehicle): number | null {
    const value =
      vehicle.market_value ?? vehicle.retail_price ?? null;

    return nullableNumber(value);
  }

  function getDesiredProfit(vehicle: Vehicle) {
    return Number(
      vehicle.desired_profit ??
        vehicle.target_profit ??
        profileDefaults.desiredProfit
    );
  }

  function calculateMaxBid(vehicle: Vehicle): number | null {
    const storedRecommendedBid = nullableNumber(
      vehicle.recommended_bid
    );

    if (storedRecommendedBid !== null) {
      return storedRecommendedBid;
    }

    const retailPrice = getRetailPrice(vehicle);

    if (retailPrice === null) {
      return null;
    }

    const desiredProfit = getDesiredProfit(vehicle);
    const repairs = Number(vehicle.estimated_repairs ?? 0);
    const transport = Number(vehicle.estimated_transport ?? 0);
    const fees = Number(vehicle.estimated_fees ?? 0);

    return (
      retailPrice -
      desiredProfit -
      repairs -
      transport -
      fees
    );
  }

  const filteredVehicles = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    let result = vehicles.filter((vehicle) => {
      const combined = [
        vehicle.title,
        vehicle.vehicle_year,
        vehicle.vehicle_make,
        vehicle.vehicle_model,
        vehicle.lot_number,
        vehicle.location,
        vehicle.state_code,
        vehicle.title_status,
        vehicle.source,
        vehicle.primary_damage,
        vehicle.secondary_damage,
        vehicle.run_condition,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || combined.includes(search);

      const status = (vehicle.title_status || "").toLowerCase();

      const matchesFilter =
        titleFilter === "all" ||
        (titleFilter === "clean" && status.includes("clean")) ||
        (titleFilter === "salvage" &&
          status.includes("salvage")) ||
        (titleFilter === "unknown" && !vehicle.title_status);

      return matchesSearch && matchesFilter;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "highest_max_bid") {
        return (
          (calculateMaxBid(b) ?? Number.NEGATIVE_INFINITY) -
          (calculateMaxBid(a) ?? Number.NEGATIVE_INFINITY)
        );
      }

      if (sortBy === "highest_profit") {
        return getDesiredProfit(b) - getDesiredProfit(a);
      }

      if (sortBy === "highest_score") {
        return (
          (b.profyt_score ?? Number.NEGATIVE_INFINITY) -
          (a.profyt_score ?? Number.NEGATIVE_INFINITY)
        );
      }

      if (sortBy === "highest_retail") {
        return (
          (getRetailPrice(b) ?? Number.NEGATIVE_INFINITY) -
          (getRetailPrice(a) ?? Number.NEGATIVE_INFINITY)
        );
      }

      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    });

    return result;
  }, [
    vehicles,
    searchTerm,
    titleFilter,
    sortBy,
    profileDefaults.desiredProfit,
  ]);

  async function saveVehicle() {
    setMessage("");
    setMessageIsError(false);

    const cleanUrl = auctionUrl.trim();

    if (!cleanUrl) {
      setMessage("Please paste a Copart or IAAI link.");
      setMessageIsError(true);
      return;
    }

    setSavingVehicle(true);
    setMessage("Reading auction listing...");

    let auctionAnalysis: AuctionAnalysis;

    try {
      auctionAnalysis = await analyzeVehicleUrl(cleanUrl);
    } catch (error) {
      setSavingVehicle(false);
      setMessageIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "The vehicle could not be analyzed."
      );
      return;
    }

    const desiredProfit = profileDefaults.desiredProfit;
    const estimatedFees = profileDefaults.auctionFees;
    const estimatedTransport = profileDefaults.transport;
    const estimatedRepairs = profileDefaults.repairs;

    setMessage("Saving vehicle and starting AI analysis...");

    const { data: insertedVehicle, error: insertError } =
      await supabase
        .from("vehicles")
        .insert({
          user_id: userId,
          auction_url: auctionAnalysis.auctionUrl,
          image_url: auctionAnalysis.imageUrl,
          source: auctionAnalysis.source,
          lot_number: auctionAnalysis.lotNumber,
          title: auctionAnalysis.title,
          vehicle_year: auctionAnalysis.vehicleYear,
          vehicle_make: auctionAnalysis.vehicleMake,
          vehicle_model: auctionAnalysis.vehicleModel,
          location: auctionAnalysis.location,
          state_code: auctionAnalysis.stateCode,
          title_status: auctionAnalysis.titleStatus,
          mileage: auctionAnalysis.mileage?.value ?? null,
          mileage_unit: auctionAnalysis.mileage?.unit ?? null,
          listing_mileage: auctionAnalysis.mileage?.value ?? null,
          listing_mileage_unit: auctionAnalysis.mileage?.unit ?? null,
          listing_mileage_captured_at: auctionAnalysis.mileage
            ? auctionAnalysis.analyzedAt
            : null,
          primary_damage: auctionAnalysis.primaryDamage,
          secondary_damage: auctionAnalysis.secondaryDamage,
          run_condition: auctionAnalysis.runCondition,
          analysis_status: auctionAnalysis.analysisStatus,
          analysis_warnings: auctionAnalysis.warnings,
          auction_images: auctionAnalysis.images,
          auction_page_title: auctionAnalysis.pageTitle,
          auction_description: auctionAnalysis.description,
          analyzed_at: auctionAnalysis.analyzedAt,
          retail_price: null,
          market_value: null,
          recommended_bid: null,
          profyt_score: null,
          desired_profit: desiredProfit,
          target_profit: desiredProfit,
          estimated_fees: estimatedFees,
          estimated_transport: estimatedTransport,
          estimated_repairs: estimatedRepairs,
          is_won: false,
          is_sold: false,
        })
        .select("id")
        .single();

    if (insertError || !insertedVehicle) {
      setSavingVehicle(false);
      setMessage(insertError?.message || "Vehicle could not be saved.");
      setMessageIsError(true);
      return;
    }

    setMessage(
      auctionAnalysis.images.length > 0
        ? "Analyzing auction photos, repair risk and current market listings..."
        : "Researching market value and repair risk. Auction photos were not available for vision analysis..."
    );

    try {
      const marketAnalysis = await runMarketAnalysis(
        insertedVehicle.id
      );

      setAuctionUrl("");
      setMessageIsError(false);

      if (marketAnalysis.status === "limited") {
        setMessage(
          "Vehicle saved and AI analysis completed with limited evidence. Open Analysis to review warnings."
        );
      } else {
        setMessage(
          "Vehicle, repair risk, market value and recommended max bid were analyzed successfully."
        );
      }
    } catch (error) {
      setAuctionUrl("");
      setMessageIsError(true);
      setMessage(
        `Vehicle was saved, but AI analysis could not finish: ${
          error instanceof Error ? error.message : "Unknown error."
        }`
      );
    } finally {
      setSavingVehicle(false);
      await loadUserAndVehicles();
    }
  }

  function toggleVehicleSelection(vehicleId: string) {
    setSelectedVehicleIds((current) => {
      if (current.includes(vehicleId)) {
        return current.filter((id) => id !== vehicleId);
      }

      return [...current, vehicleId];
    });
  }

  function selectAllFiltered() {
    const filteredIds = filteredVehicles.map(
      (vehicle) => vehicle.id
    );

    setSelectedVehicleIds((current) => {
      const merged = new Set([...current, ...filteredIds]);

      return Array.from(merged);
    });
  }

  function clearSelection() {
    setSelectedVehicleIds([]);
  }

  function getSelectedVehicles() {
    return vehicles.filter((vehicle) =>
      selectedVehicleIds.includes(vehicle.id)
    );
  }

  function startWonVehicle(vehicle: Vehicle) {
    setMessage("");
    setMessageIsError(false);

    setWonVehicleId(vehicle.id);

    const possiblePurchasePrice =
      calculateMaxBid(vehicle) ?? vehicle.recommended_bid;

    setPurchasePriceInput(
      possiblePurchasePrice !== null &&
        possiblePurchasePrice !== undefined
        ? String(Math.max(0, Number(possiblePurchasePrice)))
        : ""
    );

    setPurchaseDateInput(todayInputValue());

    setActualAuctionFeesInput(
      String(vehicle.estimated_fees ?? profileDefaults.auctionFees)
    );

    setActualTransportInput(
      String(
        vehicle.estimated_transport ?? profileDefaults.transport
      )
    );

    setActualRepairsInput(
      String(vehicle.estimated_repairs ?? profileDefaults.repairs)
    );

    setOtherExpensesInput("0");
  }

  function cancelWonVehicle() {
    setWonVehicleId(null);
    setPurchasePriceInput("");
    setPurchaseDateInput("");
    setActualAuctionFeesInput("");
    setActualTransportInput("");
    setActualRepairsInput("");
    setOtherExpensesInput("0");
  }

  async function markVehicleAsWon() {
    setMessage("");
    setMessageIsError(false);

    if (!wonVehicleId) {
      return;
    }

    const purchasePrice = toNumber(purchasePriceInput);

    if (purchasePrice <= 0) {
      setMessage("Enter the actual winning purchase price.");
      setMessageIsError(true);
      return;
    }

    if (!purchaseDateInput) {
      setMessage("Select the purchase date.");
      setMessageIsError(true);
      return;
    }

    setSavingWonVehicle(true);

    const { error } = await supabase
      .from("vehicles")
      .update({
        is_won: true,
        is_sold: false,

        purchase_price: purchasePrice,
        purchase_date: purchaseDateInput,

        actual_auction_fees: toNumber(actualAuctionFeesInput),
        actual_transport: toNumber(actualTransportInput),
        actual_repairs: toNumber(actualRepairsInput),
        other_expenses: toNumber(otherExpensesInput),
      })
      .eq("id", wonVehicleId)
      .eq("user_id", userId);

    setSavingWonVehicle(false);

    if (error) {
      setMessage(error.message);
      setMessageIsError(true);
      return;
    }

    setSelectedVehicleIds((current) =>
      current.filter((id) => id !== wonVehicleId)
    );

    cancelWonVehicle();

    setMessage(
      "Vehicle moved to Inventory. You can now track actual expenses."
    );

    await loadUserAndVehicles();
  }

  async function deleteVehicle(vehicle: Vehicle) {
    const confirmed = window.confirm(
      `Delete ${vehicle.title || "this vehicle"} from your watchlist?`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setMessageIsError(false);
    setDeletingVehicleId(vehicle.id);

    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", vehicle.id)
      .eq("user_id", userId)
      .eq("is_won", false);

    setDeletingVehicleId(null);

    if (error) {
      setMessage(error.message);
      setMessageIsError(true);
      return;
    }

    setSelectedVehicleIds((current) =>
      current.filter((id) => id !== vehicle.id)
    );

    setMessage("Vehicle removed from the watchlist.");

    await loadUserAndVehicles();
  }

  function csvEscape(
    value: string | number | null | undefined
  ) {
    const text =
      value === null || value === undefined ? "" : String(value);

    return `"${text.replaceAll('"', '""')}"`;
  }

  function exportSelectedCsv() {
    setMessage("");
    setMessageIsError(false);

    const selectedVehicles = getSelectedVehicles();

    if (selectedVehicles.length === 0) {
      setMessage("Select at least one vehicle to export.");
      setMessageIsError(true);
      return;
    }

    const headers = [
      "Title",
      "Analysis Status",
      "Title Status",
      "Location",
      "State",
      "Source",
      "Lot Number",
      "Mileage",
      "Mileage Unit",
      "Primary Damage",
      "Secondary Damage",
      "Run Condition",
      "Retail Price",
      "Recommended Max Bid",
      "Desired Profit",
      "Estimated Repairs",
      "Transport",
      "Auction Fees",
      "Profyt Score",
      "Analysis Warnings",
      "Image URL",
      "Auction URL",
      "Analyzed At",
      "Created At",
    ];

    const rows = selectedVehicles.map((vehicle) => [
      vehicle.title,
      vehicle.analysis_status,
      vehicle.title_status,
      vehicle.location,
      vehicle.state_code,
      vehicle.source,
      vehicle.lot_number,
      vehicle.mileage,
      vehicle.mileage_unit,
      vehicle.primary_damage,
      vehicle.secondary_damage,
      vehicle.run_condition,
      getRetailPrice(vehicle),
      calculateMaxBid(vehicle),
      getDesiredProfit(vehicle),
      vehicle.estimated_repairs ?? 0,
      vehicle.estimated_transport ?? 0,
      vehicle.estimated_fees ?? 0,
      vehicle.profyt_score,
      vehicle.analysis_warnings?.join(" | ") ?? "",
      vehicle.image_url ?? "",
      vehicle.auction_url,
      vehicle.analyzed_at,
      vehicle.created_at,
    ]);

    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;

    link.download = `profytly-watchlist-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function htmlEscape(
    value: string | number | null | undefined
  ) {
    const text =
      value === null || value === undefined ? "" : String(value);

    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function exportSelectedPdf() {
    setMessage("");
    setMessageIsError(false);

    const selectedVehicles = getSelectedVehicles();

    if (selectedVehicles.length === 0) {
      setMessage("Select at least one vehicle to export.");
      setMessageIsError(true);
      return;
    }

    const generatedAt = new Date().toLocaleString();

    const reportHtml = `
      <!doctype html>
      <html>
        <head>
          <title>Profytly Auction Report</title>
          <meta charset="utf-8" />

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              background: #ffffff;
              color: #111827;
              font-family: Arial, Helvetica, sans-serif;
            }

            .cover {
              border-bottom: 3px solid #111827;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }

            .brand {
              font-size: 34px;
              font-weight: 900;
              letter-spacing: -1.5px;
            }

            .brand span {
              color: #16a34a;
            }

            .subtitle {
              margin-top: 8px;
              color: #4b5563;
              font-size: 14px;
            }

            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-top: 18px;
            }

            .summary-card {
              border: 1px solid #d1d5db;
              border-radius: 12px;
              padding: 14px;
            }

            .summary-label {
              color: #6b7280;
              font-size: 11px;
              text-transform: uppercase;
            }

            .summary-value {
              margin-top: 7px;
              font-size: 19px;
              font-weight: 800;
            }

            .vehicle-page {
              page-break-after: always;
              padding-top: 6px;
            }

            .vehicle-page:last-child {
              page-break-after: auto;
            }

            .vehicle-header {
              display: grid;
              grid-template-columns: 1.3fr 0.7fr;
              gap: 24px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 18px;
            }

            .vehicle-title {
              font-size: 28px;
              font-weight: 900;
              letter-spacing: -0.8px;
            }

            .badges {
              display: flex;
              flex-wrap: wrap;
              gap: 7px;
              margin-top: 12px;
            }

            .badge {
              display: inline-block;
              border-radius: 999px;
              padding: 6px 10px;
              background: #f3f4f6;
              color: #374151;
              font-size: 11px;
              font-weight: 700;
            }

            .badge-green {
              background: #dcfce7;
              color: #166534;
            }

            .badge-amber {
              background: #fef3c7;
              color: #92400e;
            }

            .badge-red {
              background: #fee2e2;
              color: #991b1b;
            }

            .meta {
              margin-top: 13px;
              color: #4b5563;
              font-size: 13px;
              line-height: 1.7;
            }

            .vehicle-image-box {
              overflow: hidden;
              min-height: 190px;
              border: 1px solid #d1d5db;
              border-radius: 14px;
              background: #f3f4f6;
            }

            .vehicle-image {
              display: block;
              width: 100%;
              height: 220px;
              object-fit: cover;
            }

            .vehicle-image-placeholder {
              display: flex;
              height: 220px;
              align-items: center;
              justify-content: center;
              padding: 18px;
              color: #6b7280;
              text-align: center;
              font-size: 13px;
            }

            .metrics {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-top: 20px;
            }

            .metric {
              border: 1px solid #d1d5db;
              border-radius: 12px;
              padding: 14px;
            }

            .metric-label {
              color: #6b7280;
              font-size: 11px;
              text-transform: uppercase;
            }

            .metric-value {
              margin-top: 7px;
              font-size: 21px;
              font-weight: 900;
            }

            .highlight {
              color: #16a34a;
            }

            .section {
              margin-top: 22px;
              border: 1px solid #d1d5db;
              border-radius: 12px;
              padding: 17px;
              background: #f9fafb;
            }

            .section-title {
              font-size: 17px;
              font-weight: 900;
            }

            .cost-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-top: 14px;
            }

            .cost-item {
              border: 1px solid #e5e7eb;
              border-radius: 9px;
              padding: 11px;
              background: white;
            }

            .cost-label {
              color: #6b7280;
              font-size: 10px;
            }

            .cost-value {
              margin-top: 5px;
              font-size: 14px;
              font-weight: 800;
            }

            .warning {
              margin-top: 18px;
              border: 1px solid #f59e0b;
              border-radius: 10px;
              padding: 13px;
              color: #92400e;
              background: #fffbeb;
              font-size: 12px;
              line-height: 1.6;
            }

            .auction-link {
              margin-top: 20px;
              color: #2563eb;
              font-size: 11px;
              word-break: break-all;
            }

            .footer {
              margin-top: 22px;
              color: #6b7280;
              font-size: 10px;
            }

            @media print {
              body {
                padding: 22px;
              }
            }
          </style>
        </head>

        <body>
          <header class="cover">
            <div class="brand">
              Profyt<span>ly</span>
            </div>

            <div class="subtitle">
              Auction Watchlist Report • Generated ${htmlEscape(
                generatedAt
              )}
            </div>

            <div class="summary">
              <div class="summary-card">
                <div class="summary-label">
                  Selected Vehicles
                </div>

                <div class="summary-value">
                  ${selectedVehicles.length}
                </div>
              </div>

              <div class="summary-card">
                <div class="summary-label">
                  Account
                </div>

                <div class="summary-value">
                  ${htmlEscape(email)}
                </div>
              </div>

              <div class="summary-card">
                <div class="summary-label">
                  Business
                </div>

                <div class="summary-value">
                  ${htmlEscape(
                    profileDefaults.businessName || "Profytly User"
                  )}
                </div>
              </div>
            </div>
          </header>

          ${selectedVehicles
            .map((vehicle) => {
              const retailPrice = getRetailPrice(vehicle);
              const desiredProfit = getDesiredProfit(vehicle);
              const maxBid = calculateMaxBid(vehicle);

              const repairs = Number(
                vehicle.estimated_repairs ?? 0
              );

              const transport = Number(
                vehicle.estimated_transport ?? 0
              );

              const fees = Number(vehicle.estimated_fees ?? 0);

              const warnings =
                vehicle.analysis_warnings?.filter(Boolean) ?? [];

              return `
                <section class="vehicle-page">
                  <div class="vehicle-header">
                    <div>
                      <div class="vehicle-title">
                        ${htmlEscape(
                          vehicle.title || "Saved Vehicle"
                        )}
                      </div>

                      <div class="badges">
                        ${
                          vehicle.title_status
                            ? `
                              <span class="badge badge-green">
                                ${htmlEscape(vehicle.title_status)}
                              </span>
                            `
                            : ""
                        }

                        ${
                          vehicle.analysis_status === "success"
                            ? `
                              <span class="badge badge-green">
                                Auction Data Captured
                              </span>
                            `
                            : ""
                        }

                        ${
                          vehicle.analysis_status === "limited"
                            ? `
                              <span class="badge badge-amber">
                                Limited Data
                              </span>
                            `
                            : ""
                        }

                        ${
                          vehicle.primary_damage
                            ? `
                              <span class="badge badge-red">
                                ${htmlEscape(
                                  vehicle.primary_damage
                                )}
                              </span>
                            `
                            : ""
                        }

                        ${
                          vehicle.run_condition
                            ? `
                              <span class="badge">
                                ${htmlEscape(
                                  vehicle.run_condition
                                )}
                              </span>
                            `
                            : ""
                        }
                      </div>

                      <div class="meta">
                        ${
                          vehicle.location
                            ? `
                              ${htmlEscape(vehicle.location)}
                              ${
                                vehicle.state_code
                                  ? `, ${htmlEscape(
                                      vehicle.state_code
                                    )}`
                                  : ""
                              }
                              <br />
                            `
                            : ""
                        }

                        ${
                          vehicle.lot_number
                            ? `
                              Lot #${htmlEscape(
                                vehicle.lot_number
                              )}
                              <br />
                            `
                            : ""
                        }

                        Source:
                        ${htmlEscape(vehicle.source || "unknown")}

                        <br />

                        Mileage:
                        ${
                          vehicle.mileage !== null
                            ? `
                              ${htmlEscape(
                                Number(
                                  vehicle.mileage
                                ).toLocaleString()
                              )}
                              ${htmlEscape(
                                vehicle.mileage_unit || ""
                              )}
                            `
                            : "Not available"
                        }

                        <br />

                        Primary damage:
                        ${htmlEscape(
                          vehicle.primary_damage || "Not available"
                        )}

                        <br />

                        Secondary damage:
                        ${htmlEscape(
                          vehicle.secondary_damage ||
                            "Not available"
                        )}
                      </div>
                    </div>

                    <div class="vehicle-image-box">
                      ${
                        vehicle.image_url
                          ? `
                            <img
                              class="vehicle-image"
                              src="${htmlEscape(
                                vehicle.image_url
                              )}"
                              alt="${htmlEscape(
                                vehicle.title || "Vehicle image"
                              )}"
                            />
                          `
                          : `
                            <div class="vehicle-image-placeholder">
                              No auction image was available.
                            </div>
                          `
                      }
                    </div>
                  </div>

                  <div class="metrics">
                    <div class="metric">
                      <div class="metric-label">
                        Expected Retail
                      </div>

                      <div class="metric-value">
                        ${money(retailPrice)}
                      </div>
                    </div>

                    <div class="metric">
                      <div class="metric-label">
                        Desired Profit
                      </div>

                      <div class="metric-value">
                        ${money(desiredProfit)}
                      </div>
                    </div>

                    <div class="metric">
                      <div class="metric-label">
                        Recommended Max Bid
                      </div>

                      <div class="metric-value highlight">
                        ${money(maxBid)}
                      </div>
                    </div>

                    <div class="metric">
                      <div class="metric-label">
                        Profyt Score
                      </div>

                      <div class="metric-value">
                        ${
                          vehicle.profyt_score !== null
                            ? `${htmlEscape(
                                vehicle.profyt_score
                              )}/100`
                            : "Pending"
                        }
                      </div>
                    </div>
                  </div>

                  <div class="section">
                    <div class="section-title">
                      Cost Assumptions
                    </div>

                    <div class="cost-grid">
                      <div class="cost-item">
                        <div class="cost-label">
                          Auction Fees
                        </div>

                        <div class="cost-value">
                          ${money(fees)}
                        </div>
                      </div>

                      <div class="cost-item">
                        <div class="cost-label">
                          Transport
                        </div>

                        <div class="cost-value">
                          ${money(transport)}
                        </div>
                      </div>

                      <div class="cost-item">
                        <div class="cost-label">
                          Repairs
                        </div>

                        <div class="cost-value">
                          ${money(repairs)}
                        </div>
                      </div>

                      <div class="cost-item">
                        <div class="cost-label">
                          Analysis Status
                        </div>

                        <div class="cost-value">
                          ${htmlEscape(
                            vehicle.analysis_status || "Pending"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  ${
                    warnings.length > 0
                      ? `
                        <div class="warning">
                          <strong>Manual review:</strong><br />
                          ${warnings
                            .map((warning) => htmlEscape(warning))
                            .join("<br />")}
                        </div>
                      `
                      : ""
                  }

                  <div class="auction-link">
                    Auction link:
                    ${htmlEscape(vehicle.auction_url)}
                  </div>

                  <div class="footer">
                    Retail value, repair estimates, max bid and
                    Profyt Score may remain pending until the market
                    and AI analysis is completed.
                  </div>
                </section>
              `;
            })
            .join("")}

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setMessage(
        "Popup blocked. Please allow popups to export the PDF."
      );

      setMessageIsError(true);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-white">
        Loading workspace...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <AppNav />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm text-zinc-400">
          Logged in as {email}
        </p>

        <h1 className="mt-4 text-4xl font-bold">
          Auction Workspace
        </h1>

        <p className="mt-3 text-zinc-400">
          Analyze auction vehicles, review profit potential and move
          won vehicles into inventory.
        </p>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-bold">Analyze Vehicle</h2>

          <p className="mt-2 text-zinc-400">
            Paste a Copart or IAAI vehicle link. Profytly will capture
            all currently available auction data.
          </p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <input
              value={auctionUrl}
              onChange={(event) =>
                setAuctionUrl(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" && !savingVehicle) {
                  saveVehicle();
                }
              }}
              placeholder="https://www.copart.com/lot/85739455/clean-title-2016-kia-sorento-lx-md-baltimore-east"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-green-500"
            />

            <button
              onClick={saveVehicle}
              disabled={savingVehicle}
              className="rounded-lg bg-green-500 px-6 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingVehicle ? "Running Full Analysis..." : "Analyze Vehicle"}
            </button>
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Account fallback values
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MiniMetric
                label="Desired Profit"
                value={money(profileDefaults.desiredProfit)}
              />

              <MiniMetric
                label="Fallback Fees"
                value={money(profileDefaults.auctionFees)}
              />

              <MiniMetric
                label="Fallback Transport"
                value={money(profileDefaults.transport)}
              />

              <MiniMetric
                label="Fallback Repairs"
                value={money(profileDefaults.repairs)}
              />
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Fallback values are used only until Profytly can produce
              automatic estimates.
            </p>
          </div>

          {message && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                messageIsError
                  ? "border-red-500/20 bg-red-500/10 text-red-400"
                  : "border-green-500/20 bg-green-500/10 text-green-400"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-bold">My Watchlist</h2>

              <p className="mt-1 text-sm text-zinc-500">
                Compare vehicles, export reports or move won vehicles
                into Inventory.
              </p>
            </div>

            <div className="text-sm text-zinc-500">
              {filteredVehicles.length} of {vehicles.length} vehicle
              {vehicles.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <input
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search make, model, lot, damage..."
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-green-500"
            />

            <select
              value={titleFilter}
              onChange={(event) =>
                setTitleFilter(event.target.value)
              }
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-green-500"
            >
              <option value="all">All Titles</option>
              <option value="clean">Clean Title</option>
              <option value="salvage">Salvage Title</option>
              <option value="unknown">Unknown Title</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-green-500"
            >
              <option value="newest">Newest First</option>

              <option value="highest_max_bid">
                Highest Max Bid
              </option>

              <option value="highest_profit">
                Highest Desired Profit
              </option>

              <option value="highest_score">
                Highest Profyt Score
              </option>

              <option value="highest_retail">
                Highest Retail Price
              </option>
            </select>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-zinc-400">
              {selectedVehicleIds.length} selected
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={selectAllFiltered}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500"
              >
                Select Visible
              </button>

              <button
                onClick={clearSelection}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500"
              >
                Clear
              </button>

              <button
                onClick={exportSelectedPdf}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black"
              >
                Export PDF
              </button>

              <button
                onClick={exportSelectedCsv}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {filteredVehicles.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-zinc-500">
                No vehicles match your filters.
              </div>
            ) : (
              filteredVehicles.map((vehicle) => {
                const maxBid = calculateMaxBid(vehicle);
                const retailPrice = getRetailPrice(vehicle);
                const desiredProfit = getDesiredProfit(vehicle);

                const isSelected =
                  selectedVehicleIds.includes(vehicle.id);

                return (
                  <article
                    key={vehicle.id}
                    className={`rounded-xl border bg-zinc-950 p-5 transition ${
                      isSelected
                        ? "border-green-500"
                        : "border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            toggleVehicleSelection(vehicle.id)
                          }
                          className="mt-1 h-5 w-5 shrink-0 accent-green-500"
                        />

                        <div className="h-28 w-36 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                          {vehicle.image_url ? (
                            <img
                              src={vehicle.image_url}
                              alt={
                                vehicle.title || "Vehicle image"
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-zinc-600">
                              No auction image
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-bold">
                              {vehicle.title || "Saved Vehicle"}
                            </h3>

                            {vehicle.title_status && (
                              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                                {vehicle.title_status}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {vehicle.analysis_status === "success" && (
                              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                                Auction Data Captured
                              </span>
                            )}

                            {vehicle.analysis_status === "limited" && (
                              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                                Limited Data
                              </span>
                            )}

                            {vehicle.mileage !== null && (
                              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                                {Number(
                                  vehicle.mileage
                                ).toLocaleString()}{" "}
                                {vehicle.mileage_unit || ""}
                              </span>
                            )}

                            {vehicle.primary_damage && (
                              <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-400">
                                {vehicle.primary_damage}
                              </span>
                            )}

                            {vehicle.run_condition && (
                              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                                {vehicle.run_condition}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 text-sm text-zinc-500">
                            {vehicle.location &&
                              `${vehicle.location}${
                                vehicle.state_code
                                  ? `, ${vehicle.state_code}`
                                  : ""
                              } • `}

                            {vehicle.source || "unknown"}

                            {vehicle.lot_number
                              ? ` • Lot: ${vehicle.lot_number}`
                              : ""}
                          </div>

                          {vehicle.analysis_status === "limited" &&
                            vehicle.analysis_warnings &&
                            vehicle.analysis_warnings.length > 0 && (
                              <p className="mt-3 max-w-2xl text-xs leading-5 text-amber-400/80">
                                {vehicle.analysis_warnings.join(
                                  " • "
                                )}
                              </p>
                            )}

                          <div className="mt-4 flex flex-wrap gap-3">
                            <Link
                              href={`/dashboard/vehicle/${vehicle.id}`}
                              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-green-500 hover:border-green-500"
                            >
                              Open Analysis
                            </Link>

                            <button
                              onClick={() =>
                                startWonVehicle(vehicle)
                              }
                              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black"
                            >
                              I Won This Vehicle
                            </button>

                            <button
                              onClick={() => deleteVehicle(vehicle)}
                              disabled={
                                deletingVehicleId === vehicle.id
                              }
                              className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:border-red-700 disabled:opacity-50"
                            >
                              {deletingVehicleId === vehicle.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[580px]">
                        <MiniMetric
                          label="Retail"
                          value={money(retailPrice)}
                        />

                        <MiniMetric
                          label="Max Bid"
                          value={money(maxBid)}
                          highlight={maxBid !== null}
                        />

                        <MiniMetric
                          label="Target Profit"
                          value={money(desiredProfit)}
                        />

                        <MiniMetric
                          label="Score"
                          value={
                            vehicle.profyt_score !== null
                              ? `${vehicle.profyt_score} / 100`
                              : "Pending"
                          }
                        />
                      </div>
                    </div>

                    {wonVehicleId === vehicle.id && (
                      <div className="mt-6 border-t border-zinc-800 pt-6">
                        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                          <div>
                            <h4 className="text-lg font-bold">
                              Record Winning Purchase
                            </h4>

                            <p className="mt-1 text-sm text-zinc-500">
                              Enter the actual auction purchase and
                              initial costs.
                            </p>
                          </div>

                          <p className="text-sm text-zinc-500">
                            Recommended max bid: {money(maxBid)}
                          </p>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <NumberField
                            label="Purchase Price"
                            value={purchasePriceInput}
                            onChange={setPurchasePriceInput}
                          />

                          <DateField
                            label="Purchase Date"
                            value={purchaseDateInput}
                            onChange={setPurchaseDateInput}
                          />

                          <NumberField
                            label="Actual Auction Fees"
                            value={actualAuctionFeesInput}
                            onChange={setActualAuctionFeesInput}
                          />

                          <NumberField
                            label="Actual Transport"
                            value={actualTransportInput}
                            onChange={setActualTransportInput}
                          />

                          <NumberField
                            label="Initial Repairs"
                            value={actualRepairsInput}
                            onChange={setActualRepairsInput}
                          />

                          <NumberField
                            label="Other Initial Expenses"
                            value={otherExpensesInput}
                            onChange={setOtherExpensesInput}
                          />
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                          <MiniMetric
                            label="Purchase"
                            value={money(
                              toNumber(purchasePriceInput)
                            )}
                          />

                          <MiniMetric
                            label="Initial Expenses"
                            value={money(
                              toNumber(actualAuctionFeesInput) +
                                toNumber(actualTransportInput) +
                                toNumber(actualRepairsInput) +
                                toNumber(otherExpensesInput)
                            )}
                          />

                          <MiniMetric
                            label="Initial Investment"
                            value={money(
                              toNumber(purchasePriceInput) +
                                toNumber(actualAuctionFeesInput) +
                                toNumber(actualTransportInput) +
                                toNumber(actualRepairsInput) +
                                toNumber(otherExpensesInput)
                            )}
                            highlight
                          />
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                          <button
                            onClick={markVehicleAsWon}
                            disabled={savingWonVehicle}
                            className="rounded-lg bg-green-500 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingWonVehicle
                              ? "Moving to Inventory..."
                              : "Confirm & Move to Inventory"}
                          </button>

                          <button
                            onClick={cancelWonVehicle}
                            disabled={savingWonVehicle}
                            className="rounded-lg border border-zinc-700 px-5 py-3 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function MiniMetric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>

      <p
        className={`mt-1 font-bold ${
          highlight ? "text-green-500" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400">{label}</label>

      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
          $
        </span>

        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-3 pl-9 pr-4 text-white outline-none focus:border-green-500"
        />
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400">{label}</label>

      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-green-500"
      />
    </div>
  );
}
