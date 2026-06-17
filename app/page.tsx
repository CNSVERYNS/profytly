"use client";

import { useState } from "react";
import {
  ArrowRight,
  Calculator,
  MapPin,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function joinWaitlist() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setMessage(data.message || data.error || "Something happened");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="text-2xl font-bold">
          Profyt<span className="text-green-500">ly</span>
        </div>

        <div className="hidden gap-8 text-sm text-zinc-400 md:flex">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
        </div>

        <a
          href="#join"
          className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-black"
        >
          Join Beta
        </a>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-4xl">
          <div className="inline-flex rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-400">
            🚗 Auction Intelligence Platform
          </div>

          <h1 className="mt-8 text-5xl font-bold tracking-tight md:text-7xl">
            Paste Any Copart or IAAI Link.
            <span className="text-green-500"> Get Your Max Bid.</span>
          </h1>

          <p className="mt-6 max-w-3xl text-xl text-zinc-400">
            Profytly helps flippers, dealers and auction buyers estimate market
            value, costs, risk and profit before placing a bid.
          </p>

          <div id="join" className="mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
            />

            <button
              onClick={joinWaitlist}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-semibold text-black hover:bg-green-600 disabled:opacity-60"
            >
              {loading ? "Joining..." : "Join Beta"} <ArrowRight size={18} />
            </button>
          </div>

          {message && <p className="mt-3 text-sm text-green-400">{message}</p>}
        </div>

        <div className="mt-20 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 lg:col-span-2">
            <div className="mb-4 text-sm text-zinc-400">Example Analysis</div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold">2016 Kia Sorento LX</h3>
                <p className="mt-2 text-zinc-400">
                  146,493 Miles • Clean Title • Run & Drive
                </p>
              </div>

              <div className="rounded-full bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400">
                Low Risk
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Metric label="Market Value" value="$8,900" />
              <Metric label="Dealer Value" value="$9,700" />
              <Metric label="Auction Fees" value="$875" />
              <Metric label="Transport" value="$300" />
              <Metric label="Estimated Repairs" value="$900" />
              <Metric label="Target Profit" value="$1,975" />
            </div>

            <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="text-sm text-zinc-400">Recommended Max Bid</div>
              <div className="mt-2 text-4xl font-bold text-green-500">
                $6,200
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                Based on dealer value, estimated costs and target profit.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="text-sm text-zinc-400">Profyt Score</div>

            <div className="mt-8 flex items-end gap-2">
              <div className="text-6xl font-bold">88</div>
              <div className="mb-2 text-zinc-500">/100</div>
            </div>

            <div className="mt-4 text-xl font-bold text-green-500">
              Strong Buy
            </div>

            <p className="mt-4 text-sm text-zinc-400">
              Low risk, clean title, run & drive, and enough room for profit.
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-bold md:text-5xl">
          Built for auction buyers who still use notes, tabs and spreadsheets.
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          <Feature
            icon={<Calculator />}
            title="Auction Fees"
            text="Estimate Copart and IAAI fees before bidding."
          />
          <Feature
            icon={<MapPin />}
            title="Local Market"
            text="Compare estimated private party and dealer values."
          />
          <Feature
            icon={<ShieldAlert />}
            title="Risk Flags"
            text="Title, mileage, run status and damage warnings."
          />
          <Feature
            icon={<TrendingUp />}
            title="Profit Estimate"
            text="See conservative, recommended and aggressive bid ranges."
          />
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="text-green-500">{icon}</div>
      <h3 className="mt-5 font-bold">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{text}</p>
    </div>
  );
}