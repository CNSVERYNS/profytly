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
  notes: string | null;
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

    setVehicle(vehicleData);

    const { data: noteData } = await supabase
      .from("vehicle_notes")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });

    setNotes(noteData || []);
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

  if (!vehicle) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-white">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <nav className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
        <Link href="/dashboard" className="text-2xl font-bold">
          Profyt<span className="text-green-500">ly</span>
        </Link>

        <Link href="/dashboard" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
          Back to Dashboard
        </Link>
      </nav>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm uppercase text-zinc-500">
            {vehicle.source || "Auction"} Vehicle
          </div>

          <h1 className="mt-3 text-4xl font-bold">
            {vehicle.title || "Saved Vehicle"}
          </h1>

          <div className="mt-4 text-zinc-400">
            {vehicle.lot_number && <p>Lot #{vehicle.lot_number}</p>}
            <p>Source: {vehicle.source || "unknown"}</p>
          </div>

          <a
            href={vehicle.auction_url}
            target="_blank"
            className="mt-6 inline-block rounded-lg bg-green-500 px-5 py-3 font-semibold text-black"
          >
            Open Auction Link
          </a>

          <button
            onClick={deleteVehicle}
            className="ml-3 rounded-lg border border-red-800 px-5 py-3 text-red-400"
          >
            Delete Vehicle
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Notes</h2>

          <div className="mt-5 flex flex-col gap-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Example: Check front bumper, possible repaint, max bid $6,200..."
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