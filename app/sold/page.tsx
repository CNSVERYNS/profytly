"use client";

import AppNav from "@/components/AppNav";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Vehicle = {
  id: string;
  user_id: string;
  auction_url: string;
  image_url: string | null;
  source: string | null;
  lot_number: string | null;
  title: string | null;
  location: string | null;
  state_code: string | null;

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
};

type VehicleExpense = {
  id: string;
  vehicle_id: string;
  category: string;
  amount: number;
  expense_date: string;
  notes: string | null;
};

export default function SoldVehiclesPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  const [purchasePriceInput, setPurchasePriceInput] = useState("");
  const [purchaseDateInput, setPurchaseDateInput] = useState("");
  const [auctionFeesInput, setAuctionFeesInput] = useState("");
  const [transportInput, setTransportInput] = useState("");
  const [repairsInput, setRepairsInput] = useState("");
  const [otherExpensesInput, setOtherExpensesInput] = useState("");

  const [salePriceInput, setSalePriceInput] = useState("");
  const [saleDateInput, setSaleDateInput] = useState("");
  const [sellingExpensesInput, setSellingExpensesInput] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSoldVehicles();
  }, []);

  async function loadSoldVehicles() {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      router.push("/login");
      return;
    }

    setUserId(authData.user.id);

    const [vehicleResponse, expenseResponse] = await Promise.all([
      supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", authData.user.id)
        .eq("is_won", true)
        .eq("is_sold", true)
        .order("sale_date", { ascending: false }),

      supabase
        .from("vehicle_expenses")
        .select("*")
        .eq("user_id", authData.user.id)
        .order("expense_date", { ascending: false }),
    ]);

    if (vehicleResponse.error) {
      setMessage(vehicleResponse.error.message);
      setLoading(false);
      return;
    }

    if (expenseResponse.error) {
      setMessage(expenseResponse.error.message);
      setLoading(false);
      return;
    }

    setVehicles(vehicleResponse.data || []);
    setExpenses(expenseResponse.data || []);
    setLoading(false);
  }

  function toNumber(value: string) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function money(value: number | null | undefined) {
    return `$${Number(value ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function getAdditionalExpenses(vehicleId: string) {
    return expenses
      .filter((expense) => expense.vehicle_id === vehicleId)
      .reduce(
        (total, expense) => total + Number(expense.amount ?? 0),
        0
      );
  }

  function calculateTotalInvestment(vehicle: Vehicle) {
    return (
      (vehicle.purchase_price ?? 0) +
      (vehicle.actual_auction_fees ?? 0) +
      (vehicle.actual_transport ?? 0) +
      (vehicle.actual_repairs ?? 0) +
      (vehicle.other_expenses ?? 0) +
      getAdditionalExpenses(vehicle.id)
    );
  }

  function calculateTotalCosts(vehicle: Vehicle) {
    return (
      calculateTotalInvestment(vehicle) +
      (vehicle.selling_expenses ?? 0)
    );
  }

  function calculateProfit(vehicle: Vehicle) {
    return (vehicle.sale_price ?? 0) - calculateTotalCosts(vehicle);
  }

  function calculateDaysHeld(vehicle: Vehicle) {
    if (!vehicle.purchase_date || !vehicle.sale_date) {
      return null;
    }

    const purchaseDate = new Date(`${vehicle.purchase_date}T00:00:00`);
    const saleDate = new Date(`${vehicle.sale_date}T00:00:00`);

    const difference = saleDate.getTime() - purchaseDate.getTime();

    return Math.max(
      0,
      Math.round(difference / (1000 * 60 * 60 * 24))
    );
  }

  const totals = useMemo(() => {
    return vehicles.reduce(
      (result, vehicle) => {
        result.revenue += vehicle.sale_price ?? 0;
        result.costs += calculateTotalCosts(vehicle);
        result.profit += calculateProfit(vehicle);

        return result;
      },
      {
        revenue: 0,
        costs: 0,
        profit: 0,
      }
    );
  }, [vehicles, expenses]);

  function startEdit(vehicle: Vehicle) {
    setMessage("");
    setEditingVehicleId(vehicle.id);

    setPurchasePriceInput(String(vehicle.purchase_price ?? 0));
    setPurchaseDateInput(vehicle.purchase_date ?? "");
    setAuctionFeesInput(String(vehicle.actual_auction_fees ?? 0));
    setTransportInput(String(vehicle.actual_transport ?? 0));
    setRepairsInput(String(vehicle.actual_repairs ?? 0));
    setOtherExpensesInput(String(vehicle.other_expenses ?? 0));

    setSalePriceInput(String(vehicle.sale_price ?? 0));
    setSaleDateInput(vehicle.sale_date ?? "");
    setSellingExpensesInput(String(vehicle.selling_expenses ?? 0));
  }

  async function saveFinancialRecord() {
    if (!editingVehicleId) {
      return;
    }

    if (toNumber(purchasePriceInput) <= 0) {
      setMessage("Enter a valid purchase price.");
      return;
    }

    if (toNumber(salePriceInput) <= 0) {
      setMessage("Enter a valid sale price.");
      return;
    }

    if (!purchaseDateInput || !saleDateInput) {
      setMessage("Purchase date and sale date are required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("vehicles")
      .update({
        purchase_price: toNumber(purchasePriceInput),
        purchase_date: purchaseDateInput,
        actual_auction_fees: toNumber(auctionFeesInput),
        actual_transport: toNumber(transportInput),
        actual_repairs: toNumber(repairsInput),
        other_expenses: toNumber(otherExpensesInput),

        sale_price: toNumber(salePriceInput),
        sale_date: saleDateInput,
        selling_expenses: toNumber(sellingExpensesInput),
      })
      .eq("id", editingVehicleId)
      .eq("user_id", userId);

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditingVehicleId(null);
    setMessage("Financial record updated.");
    await loadSoldVehicles();
  }

  async function returnToInventory(vehicle: Vehicle) {
    const confirmed = confirm(
      "Move this vehicle back to current inventory?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("vehicles")
      .update({
        is_sold: false,
        sale_price: null,
        sale_date: null,
        selling_expenses: 0,
      })
      .eq("id", vehicle.id)
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Vehicle returned to inventory.");
    await loadSoldVehicles();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-white">
        Loading sold vehicles...
      </main>
    );
  }

  const averageProfit =
    vehicles.length > 0 ? totals.profit / vehicles.length : 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <AppNav />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-500">
          Completed Sales
        </p>

        <h1 className="mt-3 text-4xl font-bold">Sold Vehicles</h1>

        <p className="mt-3 text-zinc-400">
          Review actual revenue, expenses and completed vehicle profits.
        </p>

        {message && (
          <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Vehicles Sold"
            value={String(vehicles.length)}
          />

          <SummaryCard
            label="Sales Revenue"
            value={money(totals.revenue)}
          />

          <SummaryCard
            label="Total Costs"
            value={money(totals.costs)}
          />

          <SummaryCard
            label="Net Profit"
            value={money(totals.profit)}
            highlight={totals.profit >= 0}
            negative={totals.profit < 0}
          />

          <SummaryCard
            label="Average Profit"
            value={money(averageProfit)}
            highlight={averageProfit >= 0}
            negative={averageProfit < 0}
          />
        </div>

        <div className="mt-8 space-y-5">
          {vehicles.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-500">
              No sold vehicles yet.
            </div>
          ) : (
            vehicles.map((vehicle) => {
              const additionalExpenses = getAdditionalExpenses(vehicle.id);
              const totalInvestment = calculateTotalInvestment(vehicle);
              const totalCosts = calculateTotalCosts(vehicle);
              const profit = calculateProfit(vehicle);
              const daysHeld = calculateDaysHeld(vehicle);

              return (
                <div
                  key={vehicle.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
                >
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex gap-4">
                      <VehicleImage vehicle={vehicle} />

                      <div>
                        <h2 className="text-xl font-bold">
                          {vehicle.title || "Sold Vehicle"}
                        </h2>

                        <p className="mt-2 text-sm text-zinc-500">
                          {vehicle.location &&
                            `${vehicle.location}${
                              vehicle.state_code
                                ? `, ${vehicle.state_code}`
                                : ""
                            } • `}

                          {vehicle.lot_number
                            ? `Lot: ${vehicle.lot_number}`
                            : vehicle.source || "Auction vehicle"}
                        </p>

                        <p className="mt-3 text-sm text-zinc-400">
                          Purchased: {formatDate(vehicle.purchase_date)}
                          {" • "}
                          Sold: {formatDate(vehicle.sale_date)}
                        </p>

                        <p className="mt-1 text-sm text-zinc-400">
                          Days in inventory:{" "}
                          {daysHeld === null ? "-" : daysHeld}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
                      <MiniMetric
                        label="Total Investment"
                        value={money(totalInvestment)}
                      />

                      <MiniMetric
                        label="Sale Price"
                        value={money(vehicle.sale_price)}
                      />

                      <MiniMetric
                        label="Actual Profit"
                        value={money(profit)}
                        highlight={profit >= 0}
                        negative={profit < 0}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 border-t border-zinc-800 pt-5 sm:grid-cols-3 lg:grid-cols-6">
                    <MiniMetric
                      label="Purchase"
                      value={money(vehicle.purchase_price)}
                    />

                    <MiniMetric
                      label="Auction Fees"
                      value={money(vehicle.actual_auction_fees)}
                    />

                    <MiniMetric
                      label="Transport"
                      value={money(vehicle.actual_transport)}
                    />

                    <MiniMetric
                      label="Initial Repairs"
                      value={money(vehicle.actual_repairs)}
                    />

                    <MiniMetric
                      label="Added Expenses"
                      value={money(additionalExpenses)}
                    />

                    <MiniMetric
                      label="Selling Costs"
                      value={money(vehicle.selling_expenses)}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => startEdit(vehicle)}
                      className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
                    >
                      Edit Financial Record
                    </button>

                    <button
                      onClick={() => returnToInventory(vehicle)}
                      className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
                    >
                      Return to Inventory
                    </button>

                    <Link
                      href={`/dashboard/vehicle/${vehicle.id}`}
                      className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
                    >
                      Vehicle Details
                    </Link>
                  </div>

                  {editingVehicleId === vehicle.id && (
                    <div className="mt-6 border-t border-zinc-800 pt-6">
                      <h3 className="text-lg font-bold">
                        Edit Complete Financial Record
                      </h3>

                      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                          label="Auction Fees"
                          value={auctionFeesInput}
                          onChange={setAuctionFeesInput}
                        />

                        <NumberField
                          label="Transport"
                          value={transportInput}
                          onChange={setTransportInput}
                        />

                        <NumberField
                          label="Initial Repairs"
                          value={repairsInput}
                          onChange={setRepairsInput}
                        />

                        <NumberField
                          label="Other Initial Expenses"
                          value={otherExpensesInput}
                          onChange={setOtherExpensesInput}
                        />

                        <NumberField
                          label="Sale Price"
                          value={salePriceInput}
                          onChange={setSalePriceInput}
                        />

                        <DateField
                          label="Sale Date"
                          value={saleDateInput}
                          onChange={setSaleDateInput}
                        />

                        <NumberField
                          label="Selling Expenses"
                          value={sellingExpensesInput}
                          onChange={setSellingExpensesInput}
                        />
                      </div>

                      <div className="mt-6 flex gap-3">
                        <button
                          onClick={saveFinancialRecord}
                          disabled={saving}
                          className="rounded-lg bg-green-500 px-5 py-3 font-semibold text-black disabled:opacity-60"
                        >
                          {saving ? "Saving..." : "Save Record"}
                        </button>

                        <button
                          onClick={() => setEditingVehicleId(null)}
                          className="rounded-lg border border-zinc-700 px-5 py-3"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function VehicleImage({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="h-28 w-36 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      {vehicle.image_url ? (
        <img
          src={vehicle.image_url}
          alt={vehicle.title || "Vehicle"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center px-3 text-center text-xs text-zinc-600">
          No image
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight = false,
  negative = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">{label}</p>

      <p
        className={`mt-3 text-2xl font-bold ${
          negative
            ? "text-red-400"
            : highlight
              ? "text-green-500"
              : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  highlight = false,
  negative = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>

      <p
        className={`mt-1 font-bold ${
          negative
            ? "text-red-400"
            : highlight
              ? "text-green-500"
              : "text-white"
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

      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-green-500"
      />
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
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-green-500"
      />
    </div>
  );
}