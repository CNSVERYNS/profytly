"use client";

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
  title_status: string | null;

  recommended_bid: number | null;
  estimated_fees: number | null;
  estimated_transport: number | null;
  estimated_repairs: number | null;

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

type VehicleExpense = {
  id: string;
  vehicle_id: string;
  user_id: string;
  category: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_at: string;
};

export default function InventoryPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );

  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [expenseVehicleId, setExpenseVehicleId] = useState<string | null>(null);
  const [sellingVehicleId, setSellingVehicleId] = useState<string | null>(null);

  const [purchasePriceInput, setPurchasePriceInput] = useState("");
  const [purchaseDateInput, setPurchaseDateInput] = useState("");
  const [auctionFeesInput, setAuctionFeesInput] = useState("");
  const [transportInput, setTransportInput] = useState("");
  const [repairsInput, setRepairsInput] = useState("");
  const [otherExpensesInput, setOtherExpensesInput] = useState("");

  const [expenseCategoryInput, setExpenseCategoryInput] = useState("repairs");
  const [expenseAmountInput, setExpenseAmountInput] = useState("");
  const [expenseDateInput, setExpenseDateInput] = useState("");
  const [expenseNotesInput, setExpenseNotesInput] = useState("");

  const [salePriceInput, setSalePriceInput] = useState("");
  const [saleDateInput, setSaleDateInput] = useState("");
  const [sellingExpensesInput, setSellingExpensesInput] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
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
        .order("created_at", { ascending: false }),

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

  const availableVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => !vehicle.is_won);
  }, [vehicles]);

  const inventoryVehicles = useMemo(() => {
    return vehicles.filter(
      (vehicle) => vehicle.is_won && !vehicle.is_sold
    );
  }, [vehicles]);

  const inventoryTotals = useMemo(() => {
    return inventoryVehicles.reduce(
      (totals, vehicle) => {
        totals.purchaseCost += vehicle.purchase_price ?? 0;
        totals.totalInvested += calculateTotalInvestment(vehicle);

        return totals;
      },
      {
        purchaseCost: 0,
        totalInvested: 0,
      }
    );
  }, [inventoryVehicles, expenses]);

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

  function getVehicleExpenses(vehicleId: string) {
    return expenses.filter((expense) => expense.vehicle_id === vehicleId);
  }

  function calculateAdditionalExpenses(vehicleId: string) {
    return getVehicleExpenses(vehicleId).reduce(
      (total, expense) => total + Number(expense.amount ?? 0),
      0
    );
  }

  function calculateCoreExpenses(vehicle: Vehicle) {
    return (
      (vehicle.actual_auction_fees ?? 0) +
      (vehicle.actual_transport ?? 0) +
      (vehicle.actual_repairs ?? 0) +
      (vehicle.other_expenses ?? 0)
    );
  }

  function calculateTotalInvestment(vehicle: Vehicle) {
    return (
      (vehicle.purchase_price ?? 0) +
      calculateCoreExpenses(vehicle) +
      calculateAdditionalExpenses(vehicle.id)
    );
  }

  function closeAllForms() {
    setSelectedVehicleId(null);
    setEditingVehicleId(null);
    setExpenseVehicleId(null);
    setSellingVehicleId(null);
    setMessage("");
  }

  function fillPurchaseInputs(vehicle: Vehicle, useEstimates: boolean) {
    setPurchasePriceInput(
      String(vehicle.purchase_price ?? vehicle.recommended_bid ?? "")
    );

    setPurchaseDateInput(
      vehicle.purchase_date ?? new Date().toISOString().slice(0, 10)
    );

    setAuctionFeesInput(
      String(
        vehicle.actual_auction_fees ??
          (useEstimates ? vehicle.estimated_fees : 0) ??
          0
      )
    );

    setTransportInput(
      String(
        vehicle.actual_transport ??
          (useEstimates ? vehicle.estimated_transport : 0) ??
          0
      )
    );

    setRepairsInput(
      String(
        vehicle.actual_repairs ??
          (useEstimates ? vehicle.estimated_repairs : 0) ??
          0
      )
    );

    setOtherExpensesInput(String(vehicle.other_expenses ?? 0));
  }

  function startWonVehicle(vehicle: Vehicle) {
    closeAllForms();
    setSelectedVehicleId(vehicle.id);
    fillPurchaseInputs(vehicle, true);
  }

  function startEditVehicle(vehicle: Vehicle) {
    closeAllForms();
    setEditingVehicleId(vehicle.id);
    fillPurchaseInputs(vehicle, false);
  }

  function startAddExpense(vehicle: Vehicle) {
    closeAllForms();

    setExpenseVehicleId(vehicle.id);
    setExpenseCategoryInput("repairs");
    setExpenseAmountInput("");
    setExpenseDateInput(new Date().toISOString().slice(0, 10));
    setExpenseNotesInput("");
  }

  function startSellVehicle(vehicle: Vehicle) {
    closeAllForms();

    setSellingVehicleId(vehicle.id);
    setSalePriceInput("");
    setSaleDateInput(new Date().toISOString().slice(0, 10));
    setSellingExpensesInput("0");
  }

  async function markVehicleAsWon() {
    setMessage("");

    if (!selectedVehicleId) {
      return;
    }

    const purchasePrice = toNumber(purchasePriceInput);

    if (purchasePrice <= 0) {
      setMessage("Enter the actual purchase price.");
      return;
    }

    if (!purchaseDateInput) {
      setMessage("Select the purchase date.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("vehicles")
      .update({
        is_won: true,
        is_sold: false,
        purchase_price: purchasePrice,
        purchase_date: purchaseDateInput,
        actual_auction_fees: toNumber(auctionFeesInput),
        actual_transport: toNumber(transportInput),
        actual_repairs: toNumber(repairsInput),
        other_expenses: toNumber(otherExpensesInput),
      })
      .eq("id", selectedVehicleId)
      .eq("user_id", userId);

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    closeAllForms();
    setMessage("Vehicle added to inventory.");
    await loadInventory();
  }

  async function saveInventoryChanges() {
    setMessage("");

    if (!editingVehicleId) {
      return;
    }

    const purchasePrice = toNumber(purchasePriceInput);

    if (purchasePrice <= 0) {
      setMessage("Enter the actual purchase price.");
      return;
    }

    if (!purchaseDateInput) {
      setMessage("Select the purchase date.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("vehicles")
      .update({
        purchase_price: purchasePrice,
        purchase_date: purchaseDateInput,
        actual_auction_fees: toNumber(auctionFeesInput),
        actual_transport: toNumber(transportInput),
        actual_repairs: toNumber(repairsInput),
        other_expenses: toNumber(otherExpensesInput),
      })
      .eq("id", editingVehicleId)
      .eq("user_id", userId);

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    closeAllForms();
    setMessage("Inventory costs updated.");
    await loadInventory();
  }

  async function addVehicleExpense() {
    setMessage("");

    if (!expenseVehicleId) {
      return;
    }

    const amount = toNumber(expenseAmountInput);

    if (amount <= 0) {
      setMessage("Enter a valid expense amount.");
      return;
    }

    if (!expenseDateInput) {
      setMessage("Select the expense date.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("vehicle_expenses").insert({
      vehicle_id: expenseVehicleId,
      user_id: userId,
      category: expenseCategoryInput,
      amount,
      expense_date: expenseDateInput,
      notes: expenseNotesInput.trim() || null,
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    closeAllForms();
    setMessage("Additional expense added.");
    await loadInventory();
  }

  async function deleteVehicleExpense(expenseId: string) {
    const confirmed = confirm("Delete this expense?");

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("vehicle_expenses")
      .delete()
      .eq("id", expenseId)
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Expense deleted.");
    await loadInventory();
  }

  async function markVehicleAsSold(vehicle: Vehicle) {
    setMessage("");

    const salePrice = toNumber(salePriceInput);

    if (salePrice <= 0) {
      setMessage("Enter the actual sale price.");
      return;
    }

    if (!saleDateInput) {
      setMessage("Select the sale date.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("vehicles")
      .update({
        is_sold: true,
        sale_price: salePrice,
        sale_date: saleDateInput,
        selling_expenses: toNumber(sellingExpensesInput),
      })
      .eq("id", vehicle.id)
      .eq("user_id", userId);

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    closeAllForms();
    setMessage("Vehicle marked as sold.");
    await loadInventory();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-white">
        Loading inventory...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <nav className="flex flex-col gap-4 border-b border-zinc-800 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <Link href="/dashboard" className="text-2xl font-bold">
          Profyt<span className="text-green-500">ly</span>
        </Link>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
          >
            Watchlist
          </Link>

          <div className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black">
            Inventory
          </div>

          <Link
            href="/sold"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
          >
            Sold Vehicles
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-500">
          Owned Vehicles
        </p>

        <h1 className="mt-3 text-4xl font-bold">Inventory</h1>

        <p className="mt-3 text-zinc-400">
          Track actual purchase costs, additional expenses and completed sales.
        </p>

        {message && (
          <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Vehicles in Inventory"
            value={String(inventoryVehicles.length)}
          />

          <SummaryCard
            label="Total Purchase Cost"
            value={money(inventoryTotals.purchaseCost)}
          />

          <SummaryCard
            label="Total Invested"
            value={money(inventoryTotals.totalInvested)}
            highlight
          />
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Add Won Vehicle</h2>

          <p className="mt-2 text-zinc-400">
            Select a vehicle from your watchlist after winning the auction.
          </p>

          <div className="mt-6 space-y-4">
            {availableVehicles.length === 0 ? (
              <p className="text-zinc-500">
                There are no available watchlist vehicles.
              </p>
            ) : (
              availableVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-4">
                      <VehicleImage vehicle={vehicle} />

                      <div>
                        <h3 className="text-lg font-bold">
                          {vehicle.title || "Saved Vehicle"}
                        </h3>

                        <p className="mt-2 text-sm text-zinc-500">
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
                        </p>

                        <p className="mt-2 text-sm text-zinc-400">
                          Recommended bid:{" "}
                          <span className="font-semibold text-green-500">
                            {money(vehicle.recommended_bid)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => startWonVehicle(vehicle)}
                      className="rounded-lg bg-green-500 px-5 py-3 font-semibold text-black"
                    >
                      I Won This Vehicle
                    </button>
                  </div>

                  {selectedVehicleId === vehicle.id && (
                    <PurchaseForm
                      title="Enter Actual Purchase Details"
                      purchasePrice={purchasePriceInput}
                      setPurchasePrice={setPurchasePriceInput}
                      purchaseDate={purchaseDateInput}
                      setPurchaseDate={setPurchaseDateInput}
                      auctionFees={auctionFeesInput}
                      setAuctionFees={setAuctionFeesInput}
                      transport={transportInput}
                      setTransport={setTransportInput}
                      repairs={repairsInput}
                      setRepairs={setRepairsInput}
                      otherExpenses={otherExpensesInput}
                      setOtherExpenses={setOtherExpensesInput}
                      onSave={markVehicleAsWon}
                      onCancel={closeAllForms}
                      saveLabel="Add to Inventory"
                      saving={saving}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Current Inventory</h2>

              <p className="mt-2 text-zinc-400">
                Edit costs, add new expenses or record a completed sale.
              </p>
            </div>

            <p className="text-sm text-zinc-500">
              {inventoryVehicles.length} vehicle
              {inventoryVehicles.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {inventoryVehicles.length === 0 ? (
              <p className="text-zinc-500">
                No purchased vehicles in inventory yet.
              </p>
            ) : (
              inventoryVehicles.map((vehicle) => {
                const vehicleExpenses = getVehicleExpenses(vehicle.id);
                const additionalExpenses = calculateAdditionalExpenses(
                  vehicle.id
                );

                const totalInvested = calculateTotalInvestment(vehicle);

                const projectedProfit =
                  toNumber(salePriceInput) -
                  totalInvested -
                  toNumber(sellingExpensesInput);

                return (
                  <div
                    key={vehicle.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex gap-4">
                        <VehicleImage vehicle={vehicle} />

                        <div>
                          <h3 className="text-lg font-bold">
                            {vehicle.title || "Saved Vehicle"}
                          </h3>

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

                          <p className="mt-2 text-sm text-zinc-400">
                            Purchased:{" "}
                            {formatDate(vehicle.purchase_date)}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[650px]">
                        <MiniMetric
                          label="Purchase"
                          value={money(vehicle.purchase_price)}
                        />

                        <MiniMetric
                          label="Core Expenses"
                          value={money(calculateCoreExpenses(vehicle))}
                        />

                        <MiniMetric
                          label="Added Expenses"
                          value={money(additionalExpenses)}
                        />

                        <MiniMetric
                          label="Total Invested"
                          value={money(totalInvested)}
                          highlight
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 border-t border-zinc-800 pt-5">
                      <button
                        onClick={() => startEditVehicle(vehicle)}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
                      >
                        Edit Purchase Costs
                      </button>

                      <button
                        onClick={() => startAddExpense(vehicle)}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
                      >
                        Add Expense
                      </button>

                      <button
                        onClick={() => startSellVehicle(vehicle)}
                        className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black"
                      >
                        I Sold This Vehicle
                      </button>

                      <Link
                        href={`/dashboard/vehicle/${vehicle.id}`}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
                      >
                        Vehicle Details
                      </Link>
                    </div>

                    {vehicleExpenses.length > 0 && (
                      <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                        <h4 className="font-semibold">Additional Expenses</h4>

                        <div className="mt-3 space-y-3">
                          {vehicleExpenses.map((expense) => (
                            <div
                              key={expense.id}
                              className="flex flex-col gap-2 border-b border-zinc-800 pb-3 last:border-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <p className="font-medium">
                                  {formatCategory(expense.category)} —{" "}
                                  {money(expense.amount)}
                                </p>

                                <p className="mt-1 text-xs text-zinc-500">
                                  {formatDate(expense.expense_date)}
                                  {expense.notes
                                    ? ` • ${expense.notes}`
                                    : ""}
                                </p>
                              </div>

                              <button
                                onClick={() =>
                                  deleteVehicleExpense(expense.id)
                                }
                                className="w-fit text-sm text-red-400"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {editingVehicleId === vehicle.id && (
                      <PurchaseForm
                        title="Edit Purchase and Core Costs"
                        purchasePrice={purchasePriceInput}
                        setPurchasePrice={setPurchasePriceInput}
                        purchaseDate={purchaseDateInput}
                        setPurchaseDate={setPurchaseDateInput}
                        auctionFees={auctionFeesInput}
                        setAuctionFees={setAuctionFeesInput}
                        transport={transportInput}
                        setTransport={setTransportInput}
                        repairs={repairsInput}
                        setRepairs={setRepairsInput}
                        otherExpenses={otherExpensesInput}
                        setOtherExpenses={setOtherExpensesInput}
                        onSave={saveInventoryChanges}
                        onCancel={closeAllForms}
                        saveLabel="Save Changes"
                        saving={saving}
                      />
                    )}

                    {expenseVehicleId === vehicle.id && (
                      <div className="mt-6 border-t border-zinc-800 pt-6">
                        <h4 className="text-lg font-bold">
                          Add Additional Expense
                        </h4>

                        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className="text-sm text-zinc-400">
                              Category
                            </label>

                            <select
                              value={expenseCategoryInput}
                              onChange={(event) =>
                                setExpenseCategoryInput(event.target.value)
                              }
                              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
                            >
                              <option value="repairs">Repairs</option>
                              <option value="parts">Parts</option>
                              <option value="detailing">Detailing</option>
                              <option value="storage">Storage</option>
                              <option value="registration">
                                Registration
                              </option>
                              <option value="transport">Transport</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <NumberField
                            label="Amount"
                            value={expenseAmountInput}
                            onChange={setExpenseAmountInput}
                          />

                          <DateField
                            label="Expense Date"
                            value={expenseDateInput}
                            onChange={setExpenseDateInput}
                          />

                          <TextField
                            label="Notes"
                            value={expenseNotesInput}
                            onChange={setExpenseNotesInput}
                            placeholder="Extra brake repair..."
                          />
                        </div>

                        <div className="mt-6 flex gap-3">
                          <button
                            onClick={addVehicleExpense}
                            disabled={saving}
                            className="rounded-lg bg-green-500 px-5 py-3 font-semibold text-black disabled:opacity-60"
                          >
                            {saving ? "Saving..." : "Add Expense"}
                          </button>

                          <button
                            onClick={closeAllForms}
                            className="rounded-lg border border-zinc-700 px-5 py-3"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {sellingVehicleId === vehicle.id && (
                      <div className="mt-6 border-t border-zinc-800 pt-6">
                        <h4 className="text-lg font-bold">
                          Record Vehicle Sale
                        </h4>

                        <div className="mt-5 grid gap-4 md:grid-cols-3">
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

                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          <MiniMetric
                            label="Total Invested"
                            value={money(totalInvested)}
                          />

                          <MiniMetric
                            label="Selling Expenses"
                            value={money(
                              toNumber(sellingExpensesInput)
                            )}
                          />

                          <MiniMetric
                            label="Actual Profit"
                            value={money(projectedProfit)}
                            highlight={projectedProfit >= 0}
                            negative={projectedProfit < 0}
                          />
                        </div>

                        <div className="mt-6 flex gap-3">
                          <button
                            onClick={() => markVehicleAsSold(vehicle)}
                            disabled={saving}
                            className="rounded-lg bg-green-500 px-5 py-3 font-semibold text-black disabled:opacity-60"
                          >
                            {saving
                              ? "Saving..."
                              : "Confirm Vehicle Sale"}
                          </button>

                          <button
                            onClick={closeAllForms}
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

function formatCategory(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function VehicleImage({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
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
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="text-sm text-zinc-400">{label}</p>

      <p
        className={`mt-3 text-3xl font-bold ${
          highlight ? "text-green-500" : "text-white"
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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
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

function PurchaseForm({
  title,
  purchasePrice,
  setPurchasePrice,
  purchaseDate,
  setPurchaseDate,
  auctionFees,
  setAuctionFees,
  transport,
  setTransport,
  repairs,
  setRepairs,
  otherExpenses,
  setOtherExpenses,
  onSave,
  onCancel,
  saveLabel,
  saving,
}: {
  title: string;
  purchasePrice: string;
  setPurchasePrice: (value: string) => void;
  purchaseDate: string;
  setPurchaseDate: (value: string) => void;
  auctionFees: string;
  setAuctionFees: (value: string) => void;
  transport: string;
  setTransport: (value: string) => void;
  repairs: string;
  setRepairs: (value: string) => void;
  otherExpenses: string;
  setOtherExpenses: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  saving: boolean;
}) {
  return (
    <div className="mt-6 border-t border-zinc-800 pt-6">
      <h4 className="text-lg font-bold">{title}</h4>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <NumberField
          label="Purchase Price"
          value={purchasePrice}
          onChange={setPurchasePrice}
        />

        <DateField
          label="Purchase Date"
          value={purchaseDate}
          onChange={setPurchaseDate}
        />

        <NumberField
          label="Auction Fees"
          value={auctionFees}
          onChange={setAuctionFees}
        />

        <NumberField
          label="Transport"
          value={transport}
          onChange={setTransport}
        />

        <NumberField
          label="Initial Repairs"
          value={repairs}
          onChange={setRepairs}
        />

        <NumberField
          label="Other Initial Expenses"
          value={otherExpenses}
          onChange={setOtherExpenses}
        />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-green-500 px-5 py-3 font-semibold text-black disabled:opacity-60"
        >
          {saving ? "Saving..." : saveLabel}
        </button>

        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-zinc-700 px-5 py-3"
        >
          Cancel
        </button>
      </div>
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-green-500"
      />
    </div>
  );
}