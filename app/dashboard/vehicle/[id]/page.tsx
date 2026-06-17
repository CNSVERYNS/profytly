"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Vehicle = {
  id: string;
  auction_url: string;
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
  recommended_bid: number | null;

  retail_price: number | null;
  market_value: number | null;

  estimated_fees: number | null;
  estimated_transport: number | null;
  estimated_repairs: number | null;
  desired_profit: number | null;
  target_profit: number | null;

  created_at: string;
};

type Note = {
  id: string;
  content: string;
  created_at: string;
};

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [userId, setUserId] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");

  const [message, setMessage] = useState("");
  const [numbersMessage, setNumbersMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const [titleInput, setTitleInput] = useState("");
  const [titleStatusInput, setTitleStatusInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [stateCodeInput, setStateCodeInput] = useState("");
  const [sourceInput, setSourceInput] = useState("");
  const [lotNumberInput, setLotNumberInput] = useState("");

  const [retailPriceInput, setRetailPriceInput] = useState("");
  const [desiredProfitInput, setDesiredProfitInput] = useState("");
  const [repairsInput, setRepairsInput] = useState("");
  const [transportInput, setTransportInput] = useState("");
  const [feesInput, setFeesInput] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    setUserId(data.user.id);

    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .single();

    if (vehicleData) {
      setVehicle(vehicleData);

      setTitleInput(vehicleData.title ?? "");
      setTitleStatusInput(vehicleData.title_status ?? "");
      setLocationInput(vehicleData.location ?? "");
      setStateCodeInput(vehicleData.state_code ?? "");
      setSourceInput(vehicleData.source ?? "");
      setLotNumberInput(vehicleData.lot_number ?? "");

      setRetailPriceInput(String(vehicleData.retail_price ?? vehicleData.market_value ?? 0));
      setDesiredProfitInput(String(vehicleData.desired_profit ?? vehicleData.target_profit ?? 0));
      setRepairsInput(String(vehicleData.estimated_repairs ?? 0));
      setTransportInput(String(vehicleData.estimated_transport ?? 0));
      setFeesInput(String(vehicleData.estimated_fees ?? 0));
    }

    const { data: noteData } = await supabase
      .from("vehicle_notes")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });

    setNotes(noteData || []);
  }

  function toNumber(value: string) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function nullIfEmpty(value: string) {
    const cleaned = value.trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  function calculateRecommendedBid() {
    const retailPrice = toNumber(retailPriceInput);
    const desiredProfit = toNumber(desiredProfitInput);
    const repairs = toNumber(repairsInput);
    const transport = toNumber(transportInput);
    const fees = toNumber(feesInput);

    return retailPrice - desiredProfit - repairs - transport - fees;
  }

  async function saveVehicleInfo() {
    setInfoMessage("");

    const { error } = await supabase
      .from("vehicles")
      .update({
        title: nullIfEmpty(titleInput) || "Saved Vehicle",
        title_status: nullIfEmpty(titleStatusInput),
        location: nullIfEmpty(locationInput),
        state_code: nullIfEmpty(stateCodeInput)?.toUpperCase() || null,
        source: nullIfEmpty(sourceInput),
        lot_number: nullIfEmpty(lotNumberInput),
      })
      .eq("id", vehicleId);

    if (error) {
      setInfoMessage(error.message);
      return;
    }

    setInfoMessage("Vehicle info saved.");
    loadPage();
  }

  async function saveNumbers() {
    setNumbersMessage("");

    const recommendedBid = calculateRecommendedBid();

    const { error } = await supabase
      .from("vehicles")
      .update({
        retail_price: toNumber(retailPriceInput),
        market_value: toNumber(retailPriceInput),
        desired_profit: toNumber(desiredProfitInput),
        target_profit: toNumber(desiredProfitInput),
        estimated_repairs: toNumber(repairsInput),
        estimated_transport: toNumber(transportInput),
        estimated_fees: toNumber(feesInput),
        recommended_bid: recommendedBid,
      })
      .eq("id", vehicleId);

    if (error) {
      setNumbersMessage(error.message);
      return;
    }

    setNumbersMessage("Numbers saved.");
    loadPage();
  }

  async function addNote() {
    setMessage("");

    if (!noteText.trim()) {
      setMessage("Note cannot be empty.");
      return;
    }

    const { error } = await supabase.from("vehicle_notes").insert({
      vehicle_id: vehicleId,
      user_id: userId,
      content: noteText.trim(),
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setNoteText("");
    setMessage("Note added.");
    loadPage();
  }

  async function deleteVehicle() {
    const confirmed = confirm("Delete this vehicle from your watchlist?");
    if (!confirmed) return;

    await supabase.from("vehicles").delete().eq("id", vehicleId);
    router.push("/dashboard");
  }

  function money(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return `$${Number(value).toLocaleString()}`;
  }

  if (!vehicle) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-white">
        Loading...
      </main>
    );
  }

  const calculatedBid = calculateRecommendedBid();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <nav className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
        <Link href="/dashboard" className="text-2xl font-bold">
          Profyt<span className="text-green-500">ly</span>
        </Link>

        <Link
          href="/dashboard"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
        >
          Back to Dashboard
        </Link>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm uppercase text-zinc-500">
            {vehicle.source || "Auction"} Vehicle
          </div>

          <h1 className="mt-3 text-4xl font-bold">
            {vehicle.title || "Saved Vehicle"}
          </h1>

          <div className="mt-4 text-zinc-400">
            {vehicle.title_status && <p>{vehicle.title_status}</p>}

            {vehicle.location && (
              <p>
                {vehicle.location}
                {vehicle.state_code ? `, ${vehicle.state_code}` : ""}
              </p>
            )}

            {vehicle.lot_number && <p>Lot #{vehicle.lot_number}</p>}
            <p>Source: {vehicle.source || "unknown"}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={vehicle.auction_url}
              target="_blank"
              className="inline-block rounded-lg bg-green-500 px-5 py-3 font-semibold text-black"
            >
              Open Auction Link
            </a>

            <button
              onClick={deleteVehicle}
              className="rounded-lg border border-red-800 px-5 py-3 text-red-400"
            >
              Delete Vehicle
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="text-sm text-zinc-400">Profyt Score</div>

            <div className="mt-4 text-5xl font-bold">
              {vehicle.profyt_score ?? "-"}
              <span className="text-lg text-zinc-500">/100</span>
            </div>

            <div className="mt-3 font-semibold text-green-500">
              Retail Flip Mode
            </div>
          </div>

          <Metric
            label="Expected Retail Price"
            value={money(toNumber(retailPriceInput))}
          />

          <Metric
            label="Desired Profit"
            value={money(toNumber(desiredProfitInput))}
          />

          <Metric
            label="Recommended Max Bid"
            value={money(calculatedBid)}
            highlight
          />
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Edit Vehicle Info</h2>

          <p className="mt-2 text-zinc-400">
            Fix vehicle details manually when the auction link does not include full information.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
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
              onChange={setStateCodeInput}
              placeholder="MD"
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
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={saveVehicleInfo}
              className="rounded-lg bg-green-500 px-5 py-3 font-semibold text-black"
            >
              Save Vehicle Info
            </button>

            {infoMessage && (
              <p className="text-sm text-green-400">{infoMessage}</p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Edit Profit Numbers</h2>

          <p className="mt-2 text-zinc-400">
            Update your assumptions. Profytly recalculates the maximum bid instantly.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-5">
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

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={saveNumbers}
              className="rounded-lg bg-green-500 px-5 py-3 font-semibold text-black"
            >
              Save Numbers
            </button>

            {numbersMessage && (
              <p className="text-sm text-green-400">{numbersMessage}</p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Profit Formula</h2>

          <p className="mt-2 text-zinc-400">
            Recommended Max Bid = Expected Retail Price - Desired Profit -
            Repairs - Transport - Auction Fees
          </p>

          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="grid gap-3 text-sm md:grid-cols-5">
              <FormulaItem
                label="Retail Price"
                value={money(toNumber(retailPriceInput))}
              />

              <FormulaItem
                label="Desired Profit"
                value={`- ${money(toNumber(desiredProfitInput))}`}
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

            <div className="mt-5 border-t border-zinc-800 pt-5">
              <div className="text-sm text-zinc-400">Result</div>
              <div className="mt-2 text-4xl font-bold text-green-500">
                {money(calculatedBid)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Notes</h2>

          <div className="mt-5 flex flex-col gap-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Example: Check front bumper, possible repaint, max bid $5,325..."
              className="min-h-32 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
            />

            <button
              onClick={addNote}
              className="w-fit rounded-lg bg-green-500 px-5 py-3 font-semibold text-black"
            >
              Add Note
            </button>

            {message && <p className="text-sm text-green-400">{message}</p>}
          </div>

          <div className="mt-8 space-y-4">
            {notes.length === 0 ? (
              <p className="text-zinc-500">No notes yet.</p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <p className="text-zinc-200">{note.content}</p>
                  <p className="mt-3 text-xs text-zinc-500">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
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
      <div className="text-sm text-zinc-400">{label}</div>
      <div
        className={`mt-4 text-3xl font-bold ${
          highlight ? "text-green-500" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
      />
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
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
      />
    </div>
  );
}

function FormulaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}