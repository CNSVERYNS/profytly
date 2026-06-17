"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Vehicle = {
  id: string;
  auction_url: string;
  image_url: string | null;
  source: string | null;
  lot_number: string | null;
  title: string | null;
  notes: string | null;
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

  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [auctionUrl, setAuctionUrl] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [message, setMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [titleFilter, setTitleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);

  useEffect(() => {
    loadUserAndVehicles();
  }, []);

  async function loadUserAndVehicles() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    setUserId(data.user.id);
    setEmail(data.user.email || "");

    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false });

    setVehicles(vehicleData || []);
  }

  function detectSource(url: string) {
    if (url.includes("copart.com")) return "copart";
    if (url.includes("iaai.com")) return "iaai";
    return "unknown";
  }

  function extractLotNumber(url: string) {
    const match = url.match(/lot\/(\d+)/);
    return match ? match[1] : null;
  }

  function titleCase(text: string) {
    return text
      .split(" ")
      .filter(Boolean)
      .map((word) => {
        const upperWords = ["LX", "EX", "SE", "LE", "XLE", "AWD", "FWD", "RWD"];
        const upper = word.toUpperCase();

        if (upperWords.includes(upper)) return upper;

        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  function parseAuctionUrl(url: string) {
    const STATES = [
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
      "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
      "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
      "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
      "SD", "TN", "TX", "UT", "VT", "VA", "WV", "WI", "WY", "DC",
    ];

    const cleanUrl = url.split("?")[0];
    const parts = cleanUrl.split("/").filter(Boolean);
    const slug = parts[parts.length - 1] || "";
    const slugParts = slug.split("-").filter(Boolean);

    let titleStatus: string | null = null;
    let vehicleYear: string | null = null;
    let vehicleMake: string | null = null;
    let vehicleModel: string | null = null;
    let location: string | null = null;
    let stateCode: string | null = null;

    const yearIndex = slugParts.findIndex((part) =>
      /^(19|20)\d{2}$/.test(part)
    );

    if (yearIndex > -1) {
      vehicleYear = slugParts[yearIndex];

      const beforeYear = slugParts.slice(0, yearIndex);
      const afterYear = slugParts.slice(yearIndex + 1);

      if (beforeYear.length > 0) {
        titleStatus = titleCase(beforeYear.join(" "));
      }

      if (afterYear.length > 0) {
        vehicleMake = titleCase(afterYear[0]);
      }

      const stateIndex = afterYear.findIndex((part) =>
        STATES.includes(part.toUpperCase())
      );

      if (stateIndex > -1) {
        stateCode = afterYear[stateIndex].toUpperCase();

        const modelParts = afterYear.slice(1, stateIndex);
        const locationParts = afterYear.slice(stateIndex + 1);

        vehicleModel = titleCase(modelParts.join(" "));
        location = titleCase(locationParts.join(" "));
      } else {
        vehicleModel = titleCase(afterYear.slice(1).join(" "));
      }
    }

    return {
      titleStatus,
      vehicleYear,
      vehicleMake,
      vehicleModel,
      location,
      stateCode,
    };
  }

  function buildVehicleTitle(
    source: string,
    lotNumber: string | null,
    vehicleYear: string | null,
    vehicleMake: string | null,
    vehicleModel: string | null
  ) {
    if (vehicleYear && vehicleMake && vehicleModel) {
      return `${vehicleYear} ${vehicleMake} ${vehicleModel}`;
    }

    return lotNumber ? `${source.toUpperCase()} Lot ${lotNumber}` : "Saved Vehicle";
  }

  function money(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return `$${Number(value).toLocaleString()}`;
  }

  function getRetailPrice(vehicle: Vehicle) {
    return vehicle.retail_price ?? vehicle.market_value ?? 0;
  }

  function getDesiredProfit(vehicle: Vehicle) {
    return vehicle.desired_profit ?? vehicle.target_profit ?? 0;
  }

  function calculateMaxBid(vehicle: Vehicle) {
    const retailPrice = getRetailPrice(vehicle);
    const desiredProfit = getDesiredProfit(vehicle);
    const repairs = vehicle.estimated_repairs ?? 0;
    const transport = vehicle.estimated_transport ?? 0;
    const fees = vehicle.estimated_fees ?? 0;

    return retailPrice - desiredProfit - repairs - transport - fees;
  }

  const filteredVehicles = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    let result = vehicles.filter((vehicle) => {
      const combined = [
        vehicle.title,
        vehicle.lot_number,
        vehicle.location,
        vehicle.state_code,
        vehicle.title_status,
        vehicle.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || combined.includes(search);

      const status = (vehicle.title_status || "").toLowerCase();

      const matchesFilter =
        titleFilter === "all" ||
        (titleFilter === "clean" && status.includes("clean")) ||
        (titleFilter === "salvage" && status.includes("salvage")) ||
        (titleFilter === "unknown" && !vehicle.title_status);

      return matchesSearch && matchesFilter;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "highest_max_bid") {
        return calculateMaxBid(b) - calculateMaxBid(a);
      }

      if (sortBy === "highest_profit") {
        return getDesiredProfit(b) - getDesiredProfit(a);
      }

      if (sortBy === "highest_score") {
        return (b.profyt_score ?? 0) - (a.profyt_score ?? 0);
      }

      if (sortBy === "highest_retail") {
        return getRetailPrice(b) - getRetailPrice(a);
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [vehicles, searchTerm, titleFilter, sortBy]);

  async function saveVehicle() {
    setMessage("");

    if (!auctionUrl.trim()) {
      setMessage("Please paste a Copart or IAAI link.");
      return;
    }

    const source = detectSource(auctionUrl);
    const lotNumber = extractLotNumber(auctionUrl);
    const parsed = parseAuctionUrl(auctionUrl);

    const title = buildVehicleTitle(
      source,
      lotNumber,
      parsed.vehicleYear,
      parsed.vehicleMake,
      parsed.vehicleModel
    );

    const retailPrice = 8900;
    const desiredProfit = 1500;
    const estimatedFees = 875;
    const estimatedTransport = 300;
    const estimatedRepairs = 900;

    const recommendedBid =
      retailPrice -
      desiredProfit -
      estimatedRepairs -
      estimatedTransport -
      estimatedFees;

    const { error } = await supabase.from("vehicles").insert({
      user_id: userId,
      auction_url: auctionUrl.trim(),
      image_url: null,
      source,
      lot_number: lotNumber,
      title,
      vehicle_year: parsed.vehicleYear,
      vehicle_make: parsed.vehicleMake,
      vehicle_model: parsed.vehicleModel,
      location: parsed.location,
      state_code: parsed.stateCode,
      title_status: parsed.titleStatus,

      profyt_score: 88,
      retail_price: retailPrice,
      market_value: retailPrice,
      desired_profit: desiredProfit,
      target_profit: desiredProfit,
      recommended_bid: recommendedBid,
      estimated_fees: estimatedFees,
      estimated_transport: estimatedTransport,
      estimated_repairs: estimatedRepairs,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setAuctionUrl("");
    setMessage("Vehicle saved.");
    loadUserAndVehicles();
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
    const filteredIds = filteredVehicles.map((vehicle) => vehicle.id);

    setSelectedVehicleIds((current) => {
      const merged = new Set([...current, ...filteredIds]);
      return Array.from(merged);
    });
  }

  function clearSelection() {
    setSelectedVehicleIds([]);
  }

  function csvEscape(value: string | number | null | undefined) {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  }

  function htmlEscape(value: string | number | null | undefined) {
    const text = value === null || value === undefined ? "" : String(value);

    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getSelectedVehicles() {
    return vehicles.filter((vehicle) => selectedVehicleIds.includes(vehicle.id));
  }

  function exportSelectedCsv() {
    setMessage("");

    const selectedVehicles = getSelectedVehicles();

    if (selectedVehicles.length === 0) {
      setMessage("Select at least one vehicle to export.");
      return;
    }

    const headers = [
      "Title",
      "Title Status",
      "Location",
      "State",
      "Source",
      "Lot Number",
      "Retail Price",
      "Recommended Max Bid",
      "Desired Profit",
      "Estimated Repairs",
      "Transport",
      "Auction Fees",
      "Profyt Score",
      "Image URL",
      "Auction URL",
      "Created At",
    ];

    const rows = selectedVehicles.map((vehicle) => [
      vehicle.title,
      vehicle.title_status,
      vehicle.location,
      vehicle.state_code,
      vehicle.source,
      vehicle.lot_number,
      getRetailPrice(vehicle),
      calculateMaxBid(vehicle),
      getDesiredProfit(vehicle),
      vehicle.estimated_repairs ?? 0,
      vehicle.estimated_transport ?? 0,
      vehicle.estimated_fees ?? 0,
      vehicle.profyt_score ?? "",
      vehicle.image_url ?? "",
      vehicle.auction_url,
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

  function exportSelectedPdf() {
    setMessage("");

    const selectedVehicles = getSelectedVehicles();

    if (selectedVehicles.length === 0) {
      setMessage("Select at least one vehicle to export.");
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
              margin-bottom: 32px;
            }

            .brand {
              font-size: 32px;
              font-weight: 800;
              letter-spacing: -0.04em;
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
              margin-top: 16px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
            }

            .summary-card {
              border: 1px solid #d1d5db;
              border-radius: 12px;
              padding: 14px;
            }

            .summary-card .label {
              color: #6b7280;
              font-size: 12px;
            }

            .summary-card .value {
              margin-top: 6px;
              font-size: 20px;
              font-weight: 800;
            }

            .vehicle-page {
              page-break-after: always;
              padding-top: 8px;
            }

            .vehicle-page:last-child {
              page-break-after: auto;
            }

            .vehicle-header {
              display: grid;
              grid-template-columns: 1.3fr 0.7fr;
              gap: 24px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }

            .vehicle-title {
              font-size: 28px;
              font-weight: 800;
              letter-spacing: -0.03em;
            }

            .badge {
              display: inline-block;
              margin-top: 10px;
              padding: 6px 10px;
              border-radius: 999px;
              background: #dcfce7;
              color: #166534;
              font-weight: 700;
              font-size: 12px;
            }

            .meta {
              margin-top: 10px;
              color: #4b5563;
              font-size: 14px;
              line-height: 1.7;
            }

            .vehicle-image-box {
              overflow: hidden;
              border: 1px solid #d1d5db;
              border-radius: 14px;
              min-height: 180px;
              background: #f3f4f6;
            }

            .vehicle-image {
              width: 100%;
              height: 220px;
              object-fit: cover;
              display: block;
            }

            .vehicle-image-placeholder {
              height: 220px;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              color: #6b7280;
              font-size: 13px;
              padding: 16px;
            }

            .score-row {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-top: 18px;
            }

            .score-card {
              border: 1px solid #d1d5db;
              border-radius: 12px;
              padding: 14px;
            }

            .score-card .label {
              color: #6b7280;
              font-size: 12px;
            }

            .score-card .value {
              margin-top: 8px;
              font-size: 22px;
              font-weight: 800;
            }

            .highlight {
              color: #16a34a;
            }

            .formula {
              margin-top: 22px;
              border: 1px solid #d1d5db;
              border-radius: 12px;
              padding: 16px;
              background: #f9fafb;
            }

            .formula-title {
              font-size: 18px;
              font-weight: 800;
            }

            .formula-text {
              margin-top: 8px;
              color: #4b5563;
              font-size: 13px;
            }

            .formula-row {
              margin-top: 16px;
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 10px;
            }

            .formula-item {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 12px;
              background: white;
            }

            .formula-item .label {
              color: #6b7280;
              font-size: 11px;
            }

            .formula-item .value {
              margin-top: 6px;
              font-weight: 800;
            }

            .result {
              margin-top: 16px;
              border-top: 1px solid #d1d5db;
              padding-top: 16px;
            }

            .result .label {
              color: #6b7280;
              font-size: 12px;
            }

            .result .value {
              margin-top: 6px;
              color: #16a34a;
              font-size: 32px;
              font-weight: 900;
            }

            .auction-link {
              margin-top: 20px;
              word-break: break-all;
              font-size: 12px;
              color: #2563eb;
            }

            .notes {
              margin-top: 20px;
              border: 1px dashed #d1d5db;
              border-radius: 12px;
              padding: 16px;
            }

            .notes-title {
              font-weight: 800;
            }

            .notes-text {
              margin-top: 8px;
              color: #6b7280;
              font-size: 13px;
            }

            @media print {
              body {
                padding: 24px;
              }

              .no-print {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="cover">
            <div class="brand">Profyt<span>ly</span></div>
            <div class="subtitle">
              Auction Watchlist Report • Generated ${htmlEscape(generatedAt)}
            </div>

            <div class="summary">
              <div class="summary-card">
                <div class="label">Selected Vehicles</div>
                <div class="value">${selectedVehicles.length}</div>
              </div>

              <div class="summary-card">
                <div class="label">Report Type</div>
                <div class="value">Retail Flip</div>
              </div>

              <div class="summary-card">
                <div class="label">Generated By</div>
                <div class="value">Profytly</div>
              </div>
            </div>
          </div>

          ${selectedVehicles
            .map((vehicle) => {
              const retailPrice = getRetailPrice(vehicle);
              const desiredProfit = getDesiredProfit(vehicle);
              const repairs = vehicle.estimated_repairs ?? 0;
              const transport = vehicle.estimated_transport ?? 0;
              const fees = vehicle.estimated_fees ?? 0;
              const maxBid = calculateMaxBid(vehicle);

              return `
                <section class="vehicle-page">
                  <div class="vehicle-header">
                    <div>
                      <div class="vehicle-title">
                        ${htmlEscape(vehicle.title || "Saved Vehicle")}
                      </div>

                      ${
                        vehicle.title_status
                          ? `<div class="badge">${htmlEscape(vehicle.title_status)}</div>`
                          : ""
                      }

                      <div class="meta">
                        ${
                          vehicle.location
                            ? `${htmlEscape(vehicle.location)}${
                                vehicle.state_code ? `, ${htmlEscape(vehicle.state_code)}` : ""
                              }<br />`
                            : ""
                        }
                        ${
                          vehicle.lot_number
                            ? `Lot #${htmlEscape(vehicle.lot_number)}<br />`
                            : ""
                        }
                        Source: ${htmlEscape(vehicle.source || "unknown")}<br />
                        Profyt Score: ${htmlEscape(vehicle.profyt_score ?? "-")}/100
                      </div>
                    </div>

                    <div class="vehicle-image-box">
                      ${
                        vehicle.image_url
                          ? `<img class="vehicle-image" src="${htmlEscape(vehicle.image_url)}" alt="${htmlEscape(vehicle.title || "Vehicle image")}" />`
                          : `<div class="vehicle-image-placeholder">No vehicle image available</div>`
                      }
                    </div>
                  </div>

                  <div class="score-row">
                    <div class="score-card">
                      <div class="label">Expected Retail Price</div>
                      <div class="value">${money(retailPrice)}</div>
                    </div>

                    <div class="score-card">
                      <div class="label">Desired Profit</div>
                      <div class="value">${money(desiredProfit)}</div>
                    </div>

                    <div class="score-card">
                      <div class="label">Recommended Max Bid</div>
                      <div class="value highlight">${money(maxBid)}</div>
                    </div>

                    <div class="score-card">
                      <div class="label">Auction Fees</div>
                      <div class="value">${money(fees)}</div>
                    </div>
                  </div>

                  <div class="score-row">
                    <div class="score-card">
                      <div class="label">Estimated Repairs</div>
                      <div class="value">${money(repairs)}</div>
                    </div>

                    <div class="score-card">
                      <div class="label">Transport</div>
                      <div class="value">${money(transport)}</div>
                    </div>

                    <div class="score-card">
                      <div class="label">Auction Platform</div>
                      <div class="value">${htmlEscape(vehicle.source || "unknown")}</div>
                    </div>

                    <div class="score-card">
                      <div class="label">Title</div>
                      <div class="value">${htmlEscape(vehicle.title_status || "Unknown")}</div>
                    </div>
                  </div>

                  <div class="formula">
                    <div class="formula-title">Profit Formula</div>
                    <div class="formula-text">
                      Recommended Max Bid = Expected Retail Price - Desired Profit - Repairs - Transport - Auction Fees
                    </div>

                    <div class="formula-row">
                      <div class="formula-item">
                        <div class="label">Retail Price</div>
                        <div class="value">${money(retailPrice)}</div>
                      </div>

                      <div class="formula-item">
                        <div class="label">Desired Profit</div>
                        <div class="value">- ${money(desiredProfit)}</div>
                      </div>

                      <div class="formula-item">
                        <div class="label">Repairs</div>
                        <div class="value">- ${money(repairs)}</div>
                      </div>

                      <div class="formula-item">
                        <div class="label">Transport</div>
                        <div class="value">- ${money(transport)}</div>
                      </div>

                      <div class="formula-item">
                        <div class="label">Auction Fees</div>
                        <div class="value">- ${money(fees)}</div>
                      </div>
                    </div>

                    <div class="result">
                      <div class="label">Recommended Max Bid</div>
                      <div class="value">${money(maxBid)}</div>
                    </div>
                  </div>

                  <div class="auction-link">
                    Auction Link: ${htmlEscape(vehicle.auction_url)}
                  </div>

                  <div class="notes">
                    <div class="notes-title">Notes</div>
                    <div class="notes-text">
                      Notes and AI risk analysis will be included in future PDF reports.
                    </div>
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
      setMessage("Popup blocked. Please allow popups to export PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <nav className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
        <div className="text-2xl font-bold">
          Profyt<span className="text-green-500">ly</span>
        </div>

        <button
          onClick={logout}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
        >
          Logout
        </button>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm text-zinc-400">Logged in as {email}</p>

        <h1 className="mt-4 text-4xl font-bold">Auction Workspace</h1>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-bold">Add Vehicle</h2>
          <p className="mt-2 text-zinc-400">
            Paste a Copart or IAAI link to save it to your watchlist.
          </p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <input
              value={auctionUrl}
              onChange={(e) => setAuctionUrl(e.target.value)}
              placeholder="https://www.copart.com/lot/85739455/clean-title-2016-kia-sorento-lx-md-baltimore-east"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
            />

            <button
              onClick={saveVehicle}
              className="rounded-lg bg-green-500 px-6 py-3 font-semibold text-black"
            >
              Save Vehicle
            </button>
          </div>

          {message && <p className="mt-4 text-sm text-green-400">{message}</p>}
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-bold">My Watchlist</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Track vehicles, compare profit potential, and export your auction list.
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
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search make, model, lot, location..."
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none"
            />

            <select
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none"
            >
              <option value="all">All Titles</option>
              <option value="clean">Clean Title</option>
              <option value="salvage">Salvage Title</option>
              <option value="unknown">Unknown Title</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="highest_max_bid">Highest Max Bid</option>
              <option value="highest_profit">Highest Desired Profit</option>
              <option value="highest_score">Highest Profyt Score</option>
              <option value="highest_retail">Highest Retail Price</option>
            </select>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-zinc-400">
              {selectedVehicleIds.length} selected
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={selectAllFiltered}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
              >
                Select Visible
              </button>

              <button
                onClick={clearSelection}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
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
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {filteredVehicles.length === 0 ? (
              <p className="text-zinc-500">No vehicles match your filters.</p>
            ) : (
              filteredVehicles.map((vehicle) => {
                const maxBid = calculateMaxBid(vehicle);
                const retailPrice = getRetailPrice(vehicle);
                const desiredProfit = getDesiredProfit(vehicle);
                const isSelected = selectedVehicleIds.includes(vehicle.id);

                return (
                  <div
                    key={vehicle.id}
                    className={`rounded-xl border bg-zinc-950 p-5 transition ${
                      isSelected
                        ? "border-green-500"
                        : "border-zinc-800 hover:border-green-500"
                    }`}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex gap-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleVehicleSelection(vehicle.id)}
                          className="mt-1 h-5 w-5 accent-green-500"
                        />

                        <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                          {vehicle.image_url ? (
                            <img
                              src={vehicle.image_url}
                              alt={vehicle.title || "Vehicle image"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-zinc-600">
                              No image
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

                          <div className="mt-2 text-sm text-zinc-500">
                            {vehicle.location &&
                              `${vehicle.location}${vehicle.state_code ? `, ${vehicle.state_code}` : ""} • `}
                            {vehicle.source || "unknown"}{" "}
                            {vehicle.lot_number ? `• Lot: ${vehicle.lot_number}` : ""}
                          </div>

                          <Link
                            href={`/dashboard/vehicle/${vehicle.id}`}
                            className="mt-4 inline-block text-sm text-green-500"
                          >
                            Open full analysis →
                          </Link>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4 lg:min-w-[560px]">
                        <MiniMetric label="Retail" value={money(retailPrice)} />
                        <MiniMetric label="Max Bid" value={money(maxBid)} highlight />
                        <MiniMetric label="Profit" value={money(desiredProfit)} />
                        <MiniMetric label="Score" value={`${vehicle.profyt_score ?? "-"} / 100`} />
                      </div>
                    </div>
                  </div>
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
      <div className="text-xs text-zinc-500">{label}</div>
      <div
        className={`mt-1 font-bold ${
          highlight ? "text-green-500" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}