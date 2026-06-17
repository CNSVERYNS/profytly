"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Vehicle = {
  id: string;
  auction_url: string;
  source: string | null;
  lot_number: string | null;
  title: string | null;
  notes: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  location: string | null;
  title_status: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [auctionUrl, setAuctionUrl] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [message, setMessage] = useState("");

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
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function parseAuctionUrl(url: string) {
    const cleanUrl = url.split("?")[0];
    const parts = cleanUrl.split("/").filter(Boolean);
    const slug = parts[parts.length - 1] || "";

    const slugParts = slug.split("-").filter(Boolean);

    let titleStatus: string | null = null;
    let vehicleYear: string | null = null;
    let vehicleMake: string | null = null;
    let vehicleModel: string | null = null;
    let location: string | null = null;

    const yearIndex = slugParts.findIndex((part) => /^20\d{2}|19\d{2}$/.test(part));

    if (yearIndex > -1) {
      vehicleYear = slugParts[yearIndex];

      const beforeYear = slugParts.slice(0, yearIndex);
      const afterYear = slugParts.slice(yearIndex + 1);

      if (beforeYear.length > 0) {
        titleStatus = titleCase(beforeYear.join(" "));
      }

      if (afterYear.length >= 2) {
        vehicleMake = titleCase(afterYear[0]);

        const locationStartIndex = Math.max(afterYear.length - 2, 2);
        const modelParts = afterYear.slice(1, locationStartIndex);
        const locationParts = afterYear.slice(locationStartIndex);

        vehicleModel = titleCase(modelParts.join(" "));
        location = titleCase(locationParts.join(" "));
      }
    }

    return {
      titleStatus,
      vehicleYear,
      vehicleMake,
      vehicleModel,
      location,
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

    const { error } = await supabase.from("vehicles").insert({
      user_id: userId,
      auction_url: auctionUrl.trim(),
      source,
      lot_number: lotNumber,
      title,
      vehicle_year: parsed.vehicleYear,
      vehicle_make: parsed.vehicleMake,
      vehicle_model: parsed.vehicleModel,
      location: parsed.location,
      title_status: parsed.titleStatus,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setAuctionUrl("");
    setMessage("Vehicle saved.");
    loadUserAndVehicles();
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
          <h2 className="text-xl font-bold">My Watchlist</h2>

          <div className="mt-6 space-y-4">
            {vehicles.length === 0 ? (
              <p className="text-zinc-500">No vehicles saved yet.</p>
            ) : (
              vehicles.map((vehicle) => (
                <Link
                  key={vehicle.id}
                  href={`/dashboard/vehicle/${vehicle.id}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-green-500"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold">
                        {vehicle.title || "Saved Vehicle"}
                      </div>

                      <div className="mt-1 text-sm text-zinc-500">
                        {vehicle.title_status && `${vehicle.title_status} • `}
                        {vehicle.location && `${vehicle.location} • `}
                        {vehicle.source || "unknown"}{" "}
                        {vehicle.lot_number ? `• Lot: ${vehicle.lot_number}` : ""}
                      </div>
                    </div>

                    <div className="text-sm text-green-500">
                      Open details →
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}