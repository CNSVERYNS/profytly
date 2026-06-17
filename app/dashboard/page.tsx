"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Vehicle = {
  id: string;
  auction_url: string;
  source: string | null;
  lot_number: string | null;
  title: string | null;
  notes: string | null;
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

  async function saveVehicle() {
    setMessage("");

    if (!auctionUrl.trim()) {
      setMessage("Please paste a Copart or IAAI link.");
      return;
    }

    const source = detectSource(auctionUrl);
    const lotNumber = extractLotNumber(auctionUrl);

    const { error } = await supabase.from("vehicles").insert({
      user_id: userId,
      auction_url: auctionUrl.trim(),
      source,
      lot_number: lotNumber,
      title: lotNumber ? `${source.toUpperCase()} Lot ${lotNumber}` : "Saved Vehicle",
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
              placeholder="https://www.copart.com/lot/..."
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
                <div
                  key={vehicle.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="font-semibold">
                    {vehicle.title || "Saved Vehicle"}
                  </div>

                  <div className="mt-1 text-sm text-zinc-500">
                    Source: {vehicle.source || "unknown"}{" "}
                    {vehicle.lot_number ? `• Lot: ${vehicle.lot_number}` : ""}
                  </div>

                  <a
                    href={vehicle.auction_url}
                    target="_blank"
                    className="mt-3 block text-sm text-green-500"
                  >
                    Open auction link
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}