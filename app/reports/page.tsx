"use client";

import { useEffect, useState } from "react";
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

type ReportPeriod = "week" | "month" | "year" | "all" | "custom";

export default function ReportsPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [startDate, setStartDate] = useState(getMonthStart());
  const [endDate, setEndDate] = useState(getToday());

  useEffect(() => {
    loadReportData();
  }, []);

  async function loadReportData() {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      router.push("/login");
      return;
    }

    setEmail(authData.user.email || "");

    const [vehicleResponse, expenseResponse] = await Promise.all([
      supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", authData.user.id)
        .eq("is_won", true),

      supabase
        .from("vehicle_expenses")
        .select("*")
        .eq("user_id", authData.user.id),
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

  function handlePeriodChange(value: ReportPeriod) {
    setPeriod(value);
    setMessage("");

    const today = new Date();

    if (value === "week") {
      const currentDay = today.getDay();
      const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(today);

      monday.setDate(today.getDate() - daysSinceMonday);

      setStartDate(formatInputDate(monday));
      setEndDate(formatInputDate(today));
      return;
    }

    if (value === "month") {
      const firstDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      setStartDate(formatInputDate(firstDay));
      setEndDate(formatInputDate(today));
      return;
    }

    if (value === "year") {
      const firstDay = new Date(today.getFullYear(), 0, 1);

      setStartDate(formatInputDate(firstDay));
      setEndDate(formatInputDate(today));
      return;
    }

    if (value === "all") {
      setStartDate("");
      setEndDate("");
      return;
    }

    if (value === "custom") {
      if (!startDate) {
        setStartDate(getMonthStart());
      }

      if (!endDate) {
        setEndDate(getToday());
      }
    }
  }

  function dateIsInPeriod(value: string | null | undefined) {
    if (!value) {
      return false;
    }

    if (period === "all") {
      return true;
    }

    if (!startDate || !endDate) {
      return false;
    }

    return value >= startDate && value <= endDate;
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
      Number(vehicle.purchase_price ?? 0) +
      Number(vehicle.actual_auction_fees ?? 0) +
      Number(vehicle.actual_transport ?? 0) +
      Number(vehicle.actual_repairs ?? 0) +
      Number(vehicle.other_expenses ?? 0) +
      getAdditionalExpenses(vehicle.id)
    );
  }

  function calculateTotalCost(vehicle: Vehicle) {
    return (
      calculateTotalInvestment(vehicle) +
      Number(vehicle.selling_expenses ?? 0)
    );
  }

  function calculateProfit(vehicle: Vehicle) {
    return Number(vehicle.sale_price ?? 0) - calculateTotalCost(vehicle);
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

  const purchasedVehicles = vehicles
    .filter((vehicle) => dateIsInPeriod(vehicle.purchase_date))
    .sort((a, b) =>
      String(b.purchase_date || "").localeCompare(
        String(a.purchase_date || "")
      )
    );

  const soldVehicles = vehicles
    .filter(
      (vehicle) =>
        vehicle.is_sold && dateIsInPeriod(vehicle.sale_date)
    )
    .sort((a, b) =>
      String(b.sale_date || "").localeCompare(String(a.sale_date || ""))
    );

  const currentInventory = vehicles.filter(
    (vehicle) => vehicle.is_won && !vehicle.is_sold
  );

  const purchaseSpend = purchasedVehicles.reduce(
    (total, vehicle) =>
      total + Number(vehicle.purchase_price ?? 0),
    0
  );

  const purchaseAcquisitionCosts = purchasedVehicles.reduce(
    (total, vehicle) =>
      total +
      Number(vehicle.purchase_price ?? 0) +
      Number(vehicle.actual_auction_fees ?? 0) +
      Number(vehicle.actual_transport ?? 0),
    0
  );

  const salesRevenue = soldVehicles.reduce(
    (total, vehicle) => total + Number(vehicle.sale_price ?? 0),
    0
  );

  const soldVehicleCosts = soldVehicles.reduce(
    (total, vehicle) => total + calculateTotalCost(vehicle),
    0
  );

  const netProfit = soldVehicles.reduce(
    (total, vehicle) => total + calculateProfit(vehicle),
    0
  );

  const averageProfit =
    soldVehicles.length > 0
      ? netProfit / soldVehicles.length
      : 0;

  const vehiclesWithDaysHeld = soldVehicles.filter(
    (vehicle) => calculateDaysHeld(vehicle) !== null
  );

  const averageDaysHeld =
    vehiclesWithDaysHeld.length > 0
      ? vehiclesWithDaysHeld.reduce(
          (total, vehicle) =>
            total + Number(calculateDaysHeld(vehicle) ?? 0),
          0
        ) / vehiclesWithDaysHeld.length
      : 0;

  const currentInventoryInvestment = currentInventory.reduce(
    (total, vehicle) =>
      total + calculateTotalInvestment(vehicle),
    0
  );

  function money(value: number | null | undefined) {
    return `$${Number(value ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function getPeriodLabel() {
    if (period === "week") {
      return "This Week";
    }

    if (period === "month") {
      return "This Month";
    }

    if (period === "year") {
      return "This Year";
    }

    if (period === "all") {
      return "All Time";
    }

    if (startDate && endDate) {
      return `${formatDate(startDate)} – ${formatDate(endDate)}`;
    }

    return "Custom Period";
  }

  function validateDateRange() {
    if (period === "all") {
      return true;
    }

    if (!startDate || !endDate) {
      setMessage("Select a start date and an end date.");
      return false;
    }

    if (startDate > endDate) {
      setMessage("Start date cannot be after end date.");
      return false;
    }

    return true;
  }

  function csvEscape(value: string | number | null | undefined) {
    const text =
      value === null || value === undefined ? "" : String(value);

    return `"${text.replaceAll('"', '""')}"`;
  }

  function exportCsv() {
    setMessage("");

    if (!validateDateRange()) {
      return;
    }

    if (soldVehicles.length === 0) {
      setMessage("There are no sold vehicles in this report period.");
      return;
    }

    const headers = [
      "Vehicle",
      "Lot Number",
      "Source",
      "Purchase Date",
      "Purchase Price",
      "Auction Fees",
      "Transport",
      "Initial Repairs",
      "Other Initial Expenses",
      "Additional Expenses",
      "Total Investment",
      "Sale Date",
      "Sale Price",
      "Selling Expenses",
      "Total Costs",
      "Actual Profit",
      "Days Held",
      "Auction URL",
    ];

    const rows = soldVehicles.map((vehicle) => [
      vehicle.title || "Vehicle",
      vehicle.lot_number || "",
      vehicle.source || "",
      vehicle.purchase_date || "",
      vehicle.purchase_price ?? 0,
      vehicle.actual_auction_fees ?? 0,
      vehicle.actual_transport ?? 0,
      vehicle.actual_repairs ?? 0,
      vehicle.other_expenses ?? 0,
      getAdditionalExpenses(vehicle.id),
      calculateTotalInvestment(vehicle),
      vehicle.sale_date || "",
      vehicle.sale_price ?? 0,
      vehicle.selling_expenses ?? 0,
      calculateTotalCost(vehicle),
      calculateProfit(vehicle),
      calculateDaysHeld(vehicle) ?? "",
      vehicle.auction_url,
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
    link.download = `profytly-business-report-${getToday()}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function htmlEscape(value: string | number | null | undefined) {
    const text =
      value === null || value === undefined ? "" : String(value);

    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function exportPdf() {
    setMessage("");

    if (!validateDateRange()) {
      return;
    }

    const reportHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Profytly Business Report</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              color: #18181b;
              background: white;
              font-family: Arial, Helvetica, sans-serif;
            }

            .header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              border-bottom: 3px solid #18181b;
              padding-bottom: 20px;
            }

            .brand {
              font-size: 34px;
              font-weight: 900;
              letter-spacing: -1.5px;
            }

            .brand span {
              color: #22c55e;
            }

            .report-title {
              margin-top: 8px;
              color: #52525b;
              font-size: 15px;
            }

            .report-meta {
              color: #71717a;
              font-size: 12px;
              line-height: 1.7;
              text-align: right;
            }

            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-top: 24px;
            }

            .summary-card {
              min-height: 90px;
              border: 1px solid #d4d4d8;
              border-radius: 12px;
              padding: 14px;
            }

            .summary-label {
              color: #71717a;
              font-size: 11px;
              text-transform: uppercase;
            }

            .summary-value {
              margin-top: 9px;
              font-size: 22px;
              font-weight: 800;
            }

            .profit {
              color: ${netProfit >= 0 ? "#16a34a" : "#dc2626"};
            }

            .section {
              margin-top: 28px;
            }

            .section-title {
              font-size: 20px;
              font-weight: 800;
            }

            .section-description {
              margin-top: 5px;
              color: #71717a;
              font-size: 12px;
            }

            .vehicle {
              margin-top: 16px;
              border: 1px solid #d4d4d8;
              border-radius: 14px;
              padding: 18px;
              page-break-inside: avoid;
            }

            .vehicle-header {
              display: flex;
              justify-content: space-between;
              gap: 20px;
            }

            .vehicle-title {
              font-size: 19px;
              font-weight: 800;
            }

            .vehicle-meta {
              margin-top: 6px;
              color: #71717a;
              font-size: 12px;
              line-height: 1.6;
            }

            .vehicle-profit {
              font-size: 22px;
              font-weight: 900;
              color: #16a34a;
              text-align: right;
            }

            .vehicle-profit.negative {
              color: #dc2626;
            }

            .vehicle-profit-label {
              color: #71717a;
              font-size: 10px;
              text-transform: uppercase;
              text-align: right;
            }

            .metrics {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 9px;
              margin-top: 16px;
            }

            .metric {
              border-radius: 9px;
              background: #f4f4f5;
              padding: 10px;
            }

            .metric-label {
              color: #71717a;
              font-size: 10px;
            }

            .metric-value {
              margin-top: 5px;
              font-size: 13px;
              font-weight: 700;
            }

            table {
              width: 100%;
              margin-top: 16px;
              border-collapse: collapse;
              font-size: 11px;
            }

            th {
              padding: 9px;
              background: #f4f4f5;
              color: #52525b;
              text-align: left;
            }

            td {
              padding: 9px;
              border-bottom: 1px solid #e4e4e7;
            }

            .footer {
              margin-top: 28px;
              border-top: 1px solid #d4d4d8;
              padding-top: 14px;
              color: #71717a;
              font-size: 10px;
            }

            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>

        <body>
          <header class="header">
            <div>
              <div class="brand">Profyt<span>ly</span></div>

              <div class="report-title">
                Vehicle Flipping Business Report
              </div>
            </div>

            <div class="report-meta">
              Period: ${htmlEscape(getPeriodLabel())}<br />
              Generated: ${htmlEscape(new Date().toLocaleString())}<br />
              Account: ${htmlEscape(email)}
            </div>
          </header>

          <section class="summary">
            <div class="summary-card">
              <div class="summary-label">Vehicles Purchased</div>
              <div class="summary-value">${purchasedVehicles.length}</div>
            </div>

            <div class="summary-card">
              <div class="summary-label">Purchase Spend</div>
              <div class="summary-value">${money(purchaseSpend)}</div>
            </div>

            <div class="summary-card">
              <div class="summary-label">Vehicles Sold</div>
              <div class="summary-value">${soldVehicles.length}</div>
            </div>

            <div class="summary-card">
              <div class="summary-label">Sales Revenue</div>
              <div class="summary-value">${money(salesRevenue)}</div>
            </div>

            <div class="summary-card">
              <div class="summary-label">Sold Vehicle Costs</div>
              <div class="summary-value">${money(soldVehicleCosts)}</div>
            </div>

            <div class="summary-card">
              <div class="summary-label">Net Profit</div>
              <div class="summary-value profit">${money(netProfit)}</div>
            </div>

            <div class="summary-card">
              <div class="summary-label">Average Profit</div>
              <div class="summary-value">${money(averageProfit)}</div>
            </div>

            <div class="summary-card">
              <div class="summary-label">Average Days Held</div>
              <div class="summary-value">${Math.round(
                averageDaysHeld
              )} days</div>
            </div>
          </section>

          <section class="section">
            <div class="section-title">Sold Vehicle Results</div>

            <div class="section-description">
              Complete lifetime costs are included for vehicles sold during the selected period.
            </div>

            ${
              soldVehicles.length === 0
                ? `
                  <div class="vehicle">
                    No sold vehicles were recorded during this period.
                  </div>
                `
                : soldVehicles
                    .map((vehicle) => {
                      const additionalExpenses =
                        getAdditionalExpenses(vehicle.id);

                      const totalInvestment =
                        calculateTotalInvestment(vehicle);

                      const totalCosts =
                        calculateTotalCost(vehicle);

                      const profit = calculateProfit(vehicle);

                      const daysHeld =
                        calculateDaysHeld(vehicle);

                      return `
                        <article class="vehicle">
                          <div class="vehicle-header">
                            <div>
                              <div class="vehicle-title">
                                ${htmlEscape(
                                  vehicle.title || "Sold Vehicle"
                                )}
                              </div>

                              <div class="vehicle-meta">
                                ${
                                  vehicle.lot_number
                                    ? `Lot #${htmlEscape(
                                        vehicle.lot_number
                                      )} • `
                                    : ""
                                }

                                ${htmlEscape(
                                  vehicle.source || "Auction"
                                )}<br />

                                Purchased:
                                ${htmlEscape(
                                  formatDate(vehicle.purchase_date)
                                )}

                                • Sold:
                                ${htmlEscape(
                                  formatDate(vehicle.sale_date)
                                )}

                                • Days held:
                                ${htmlEscape(daysHeld ?? "-")}
                              </div>
                            </div>

                            <div>
                              <div class="vehicle-profit-label">
                                Actual Profit
                              </div>

                              <div class="vehicle-profit ${
                                profit < 0 ? "negative" : ""
                              }">
                                ${money(profit)}
                              </div>
                            </div>
                          </div>

                          <div class="metrics">
                            <div class="metric">
                              <div class="metric-label">Purchase Price</div>
                              <div class="metric-value">
                                ${money(vehicle.purchase_price)}
                              </div>
                            </div>

                            <div class="metric">
                              <div class="metric-label">Added Expenses</div>
                              <div class="metric-value">
                                ${money(additionalExpenses)}
                              </div>
                            </div>

                            <div class="metric">
                              <div class="metric-label">Total Investment</div>
                              <div class="metric-value">
                                ${money(totalInvestment)}
                              </div>
                            </div>

                            <div class="metric">
                              <div class="metric-label">Sale Price</div>
                              <div class="metric-value">
                                ${money(vehicle.sale_price)}
                              </div>
                            </div>

                            <div class="metric">
                              <div class="metric-label">Total Costs</div>
                              <div class="metric-value">
                                ${money(totalCosts)}
                              </div>
                            </div>
                          </div>
                        </article>
                      `;
                    })
                    .join("")
            }
          </section>

          <section class="section">
            <div class="section-title">Period Summary Table</div>

            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Purchase</th>
                  <th>Total Costs</th>
                  <th>Sale Price</th>
                  <th>Profit</th>
                  <th>Days Held</th>
                </tr>
              </thead>

              <tbody>
                ${
                  soldVehicles.length === 0
                    ? `
                      <tr>
                        <td colspan="6">No completed sales.</td>
                      </tr>
                    `
                    : soldVehicles
                        .map(
                          (vehicle) => `
                            <tr>
                              <td>${htmlEscape(
                                vehicle.title || "Vehicle"
                              )}</td>

                              <td>${money(
                                vehicle.purchase_price
                              )}</td>

                              <td>${money(
                                calculateTotalCost(vehicle)
                              )}</td>

                              <td>${money(vehicle.sale_price)}</td>

                              <td>${money(
                                calculateProfit(vehicle)
                              )}</td>

                              <td>${htmlEscape(
                                calculateDaysHeld(vehicle) ?? "-"
                              )}</td>
                            </tr>
                          `
                        )
                        .join("")
                }
              </tbody>
            </table>
          </section>

          <footer class="footer">
            Generated by Profytly. Financial results are based on the values entered by the account holder.
          </footer>

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

      return;
    }

    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-white">
        Loading reports...
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

          <Link
            href="/inventory"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
          >
            Inventory
          </Link>

          <Link
            href="/sold"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
          >
            Sold Vehicles
          </Link>

          <div className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black">
            Reports
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-500">
          Business Performance
        </p>

        <h1 className="mt-3 text-4xl font-bold">Reports</h1>

        <p className="mt-3 text-zinc-400">
          Review purchases, completed sales and actual profit for any
          period.
        </p>

        {message && (
          <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {message}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="text-sm text-zinc-400">
                Report Period
              </label>

              <select
                value={period}
                onChange={(event) =>
                  handlePeriodChange(
                    event.target.value as ReportPeriod
                  )
                }
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-green-500"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            <DateField
              label="Start Date"
              value={startDate}
              onChange={(value) => {
                setStartDate(value);
                setPeriod("custom");
              }}
              disabled={period === "all"}
            />

            <DateField
              label="End Date"
              value={endDate}
              onChange={(value) => {
                setEndDate(value);
                setPeriod("custom");
              }}
              disabled={period === "all"}
            />

            <div className="flex items-end gap-3">
              <button
                onClick={exportPdf}
                className="flex-1 rounded-lg bg-green-500 px-4 py-3 font-semibold text-black"
              >
                Export PDF
              </button>

              <button
                onClick={exportCsv}
                className="flex-1 rounded-lg border border-zinc-700 px-4 py-3"
              >
                Export CSV
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm text-zinc-500">
            Viewing: {getPeriodLabel()}
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Vehicles Purchased"
            value={String(purchasedVehicles.length)}
          />

          <SummaryCard
            label="Purchase Spend"
            value={money(purchaseSpend)}
          />

          <SummaryCard
            label="Acquisition Cost"
            value={money(purchaseAcquisitionCosts)}
          />

          <SummaryCard
            label="Vehicles Sold"
            value={String(soldVehicles.length)}
          />

          <SummaryCard
            label="Sales Revenue"
            value={money(salesRevenue)}
          />

          <SummaryCard
            label="Sold Vehicle Costs"
            value={money(soldVehicleCosts)}
          />

          <SummaryCard
            label="Net Profit"
            value={money(netProfit)}
            highlight={netProfit >= 0}
            negative={netProfit < 0}
          />

          <SummaryCard
            label="Average Profit"
            value={money(averageProfit)}
            highlight={averageProfit >= 0}
            negative={averageProfit < 0}
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Average Days Held"
            value={`${Math.round(averageDaysHeld)} days`}
          />

          <SummaryCard
            label="Current Inventory"
            value={String(currentInventory.length)}
          />

          <SummaryCard
            label="Current Inventory Investment"
            value={money(currentInventoryInvestment)}
          />
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Sold Vehicle Results
              </h2>

              <p className="mt-2 text-zinc-400">
                Profit includes every recorded expense for each sold
                vehicle.
              </p>
            </div>

            <p className="text-sm text-zinc-500">
              {soldVehicles.length} completed sale
              {soldVehicles.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {soldVehicles.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-500">
                No sold vehicles were recorded during this period.
              </div>
            ) : (
              soldVehicles.map((vehicle) => {
                const totalInvestment =
                  calculateTotalInvestment(vehicle);

                const totalCosts = calculateTotalCost(vehicle);
                const profit = calculateProfit(vehicle);
                const daysHeld = calculateDaysHeld(vehicle);

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
                            {vehicle.title || "Sold Vehicle"}
                          </h3>

                          <p className="mt-2 text-sm text-zinc-500">
                            Purchased:{" "}
                            {formatDate(vehicle.purchase_date)}
                            {" • "}
                            Sold: {formatDate(vehicle.sale_date)}
                          </p>

                          <p className="mt-1 text-sm text-zinc-500">
                            Days held:{" "}
                            {daysHeld === null ? "-" : daysHeld}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[680px]">
                        <MiniMetric
                          label="Purchase"
                          value={money(vehicle.purchase_price)}
                        />

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

                    <div className="mt-4">
                      <Link
                        href={`/dashboard/vehicle/${vehicle.id}`}
                        className="text-sm font-semibold text-green-500"
                      >
                        Open vehicle details →
                      </Link>
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

function getToday() {
  return formatInputDate(new Date());
}

function getMonthStart() {
  const today = new Date();

  return formatInputDate(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString();
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

function DateField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400">{label}</label>

      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-green-500 disabled:cursor-not-allowed disabled:opacity-40"
      />
    </div>
  );
}