"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppNav from "@/components/AppNav";

type UserType = "flipper" | "dealer" | "exporter" | "personal";

export default function SettingsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [userType, setUserType] = useState<UserType>("flipper");

  const [desiredProfit, setDesiredProfit] = useState("1500");
  const [auctionFees, setAuctionFees] = useState("875");
  const [transportCost, setTransportCost] = useState("300");
  const [repairBudget, setRepairBudget] = useState("900");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setMessage("");
    setIsError(false);

    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      router.push("/login");
      return;
    }

    setUserId(authData.user.id);
    setEmail(authData.user.email || "");

    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setIsError(true);
      setLoading(false);
      return;
    }

    if (profileData) {
      setBusinessName(profileData.business_name ?? "");
      setZipCode(profileData.zip_code ?? "");
      setStateCode(profileData.state ?? "");
      setUserType((profileData.user_type as UserType) ?? "flipper");

      setDesiredProfit(
        String(profileData.default_desired_profit ?? 1500)
      );

      setAuctionFees(
        String(profileData.default_auction_fees ?? 875)
      );

      setTransportCost(
        String(profileData.default_transport ?? 300)
      );

      setRepairBudget(
        String(profileData.default_repairs ?? 900)
      );
    }

    setLoading(false);
  }

  function toNumber(value: string) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  async function saveSettings() {
    setMessage("");
    setIsError(false);

    if (!userId) {
      setMessage("User account could not be loaded.");
      setIsError(true);
      return;
    }

    if (stateCode.trim() && stateCode.trim().length !== 2) {
      setMessage("State must use the two-letter code, for example IL.");
      setIsError(true);
      return;
    }

    const numericValues = [
      toNumber(desiredProfit),
      toNumber(auctionFees),
      toNumber(transportCost),
      toNumber(repairBudget),
    ];

    if (numericValues.some((value) => value < 0)) {
      setMessage("Default financial values cannot be negative.");
      setIsError(true);
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email,
        business_name: businessName.trim() || null,
        zip_code: zipCode.trim() || null,
        state: stateCode.trim().toUpperCase() || null,
        user_type: userType,
        default_desired_profit: toNumber(desiredProfit),
        default_auction_fees: toNumber(auctionFees),
        default_transport: toNumber(transportCost),
        default_repairs: toNumber(repairBudget),
      },
      {
        onConflict: "id",
      }
    );

    setSaving(false);

    if (error) {
      setMessage(error.message);
      setIsError(true);
      return;
    }

    setStateCode(stateCode.trim().toUpperCase());
    setMessage("Settings saved successfully.");
  }

  function resetFinancialDefaults() {
    setDesiredProfit("1500");
    setAuctionFees("875");
    setTransportCost("300");
    setRepairBudget("900");
    setMessage("");
    setIsError(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-white">
        Loading settings...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <AppNav />

      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-500">
          Account Preferences
        </p>

        <h1 className="mt-3 text-4xl font-bold">Settings</h1>

        <p className="mt-3 text-zinc-400">
          Manage your business information and default auction estimates.
        </p>

        {message && (
          <div
            className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
              isError
                ? "border-red-500/20 bg-red-500/10 text-red-400"
                : "border-green-500/20 bg-green-500/10 text-green-400"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Business Profile</h2>

          <p className="mt-2 text-zinc-400">
            This information can later appear on PDF reports and exports.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <TextField
              label="Business Name"
              value={businessName}
              onChange={setBusinessName}
              placeholder="Example Auto Sales"
            />

            <ReadOnlyField label="Account Email" value={email} />

            <TextField
              label="ZIP Code"
              value={zipCode}
              onChange={setZipCode}
              placeholder="60045"
            />

            <TextField
              label="State"
              value={stateCode}
              onChange={(value) =>
                setStateCode(value.toUpperCase().slice(0, 2))
              }
              placeholder="IL"
              maxLength={2}
            />

            <div className="md:col-span-2">
              <label className="text-sm text-zinc-400">Account Type</label>

              <select
                value={userType}
                onChange={(event) =>
                  setUserType(event.target.value as UserType)
                }
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-green-500"
              >
                <option value="flipper">Vehicle Flipper</option>
                <option value="dealer">Independent Dealer</option>
                <option value="exporter">Vehicle Exporter</option>
                <option value="personal">Personal Buyer</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Default Auction Estimates</h2>

              <p className="mt-2 text-zinc-400">
                These values will be used as the starting point when a new
                vehicle is added.
              </p>
            </div>

            <button
              onClick={resetFinancialDefaults}
              className="w-fit rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
            >
              Reset Defaults
            </button>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <NumberField
              label="Default Desired Profit"
              value={desiredProfit}
              onChange={setDesiredProfit}
              helper="The profit target Profytly should initially use."
            />

            <NumberField
              label="Default Auction Fees"
              value={auctionFees}
              onChange={setAuctionFees}
              helper="Starting fee estimate before the actual invoice."
            />

            <NumberField
              label="Default Transport Cost"
              value={transportCost}
              onChange={setTransportCost}
              helper="Typical transportation cost for your area."
            />

            <NumberField
              label="Default Initial Repair Budget"
              value={repairBudget}
              onChange={setRepairBudget}
              helper="Starting repair estimate before inspecting the vehicle."
            />
          </div>

          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">Default cost assumptions</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PreviewMetric
                label="Desired Profit"
                value={money(toNumber(desiredProfit))}
              />

              <PreviewMetric
                label="Auction Fees"
                value={money(toNumber(auctionFees))}
              />

              <PreviewMetric
                label="Transport"
                value={money(toNumber(transportCost))}
              />

              <PreviewMetric
                label="Repair Budget"
                value={money(toNumber(repairBudget))}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="rounded-lg bg-green-500 px-6 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>

          <p className="text-sm text-zinc-500">
            Changes will apply to vehicles added after the defaults are
            connected to the watchlist.
          </p>
        </div>
      </section>
    </main>
  );
}

function money(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
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
      <label className="text-sm text-zinc-400">{label}</label>

      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-green-500"
      />
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400">{label}</label>

      <input
        value={value}
        readOnly
        className="mt-2 w-full cursor-not-allowed rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-500 outline-none"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper: string;
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

      <p className="mt-2 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}