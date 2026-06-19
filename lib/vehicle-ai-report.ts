export type VehicleAiReportInput = {
  vehicle: {
    title: string | null;
    auctionUrl: string;
    source: string | null;
    lotNumber: string | null;
    location: string | null;
    stateCode: string | null;
    titleStatus: string | null;
    mileage: number | null;
    mileageUnit: string | null;
    primaryDamage: string | null;
    secondaryDamage: string | null;
    runCondition: string | null;
  };

  analysis: {
    status: "pending" | "completed" | "limited" | "failed";
    marketValueLow: number | null;
    marketValueHigh: number | null;
    marketValueEstimate: number | null;
    asIsValueLow: number | null;
    asIsValueHigh: number | null;
    asIsValueEstimate: number | null;
    confidenceScore: number | null;
    visionUsed: boolean | null;
    imageCountAnalyzed: number | null;
    visibleDamage: string[];
    hiddenDamageRisks: string[];
    repairRisk: "low" | "medium" | "high" | "unknown" | null;
    riskScore: number | null;
    visibleRepairCostLow: number | null;
    visibleRepairCostHigh: number | null;
    visibleRepairCostEstimate: number | null;
    hiddenDamageContingencyLow: number | null;
    hiddenDamageContingencyHigh: number | null;
    hiddenDamageContingencyEstimate: number | null;
    repairCostLow: number | null;
    repairCostHigh: number | null;
    repairCostEstimate: number | null;
    profytScore: number | null;
    recommendedBid: number | null;
    recommendation:
      | "strong_buy"
      | "buy"
      | "watch"
      | "avoid"
      | "insufficient_data"
      | null;
    summary: string | null;
    keyFactors: string[];
    warnings: string[];
    comparableVehicles: Array<{
      title: string;
      price: number | null;
      mileage: number | null;
      location: string | null;
      url: string | null;
      source: string;
    }>;
    modelName: string | null;
    createdAt: string;
  };

  assumptions: {
    desiredProfit: number;
    repairs: number;
    transport: number;
    fees: number;
  };

  photoUrls: string[];
  notes: Array<{
    content: string;
    createdAt: string;
  }>;
};

export function exportVehicleAiDecisionReport(
  input: VehicleAiReportInput,
  existingWindow?: Window | null
) {
  if (typeof window === "undefined") {
    return;
  }

  const reportWindow = existingWindow ?? window.open("", "_blank");

  if (!reportWindow) {
    throw new Error(
      "Popup blocked. Please allow popups to export the AI report PDF."
    );
  }

  reportWindow.opener = null;

  const reportTitle = `${input.vehicle.title || "Vehicle"} - Profytly AI Decision Report`;
  const generatedAt = new Date();
  const decision = getDecisionPresentation(
    input.analysis.recommendation,
    input.analysis.recommendedBid
  );

  const location = [input.vehicle.location, input.vehicle.stateCode]
    .filter(Boolean)
    .join(", ");

  const mileage =
    input.vehicle.mileage !== null
      ? `${formatNumber(input.vehicle.mileage)} ${
          input.vehicle.mileageUnit === "km" ? "km" : "miles"
        }`
      : "Not available";

  const visibleDamage = normalizeItems(input.analysis.visibleDamage, 6, 230);
  const hiddenRisks = normalizeItems(
    input.analysis.hiddenDamageRisks,
    6,
    230
  );
  const keyFactors = normalizeItems(input.analysis.keyFactors, 6, 230);
  const warnings = normalizeItems(input.analysis.warnings, 6, 230);
  const summary = trimText(
    input.analysis.summary || "No written AI summary was returned.",
    1050
  );

  const reportHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    :root {
      --ink: #111827;
      --muted: #667085;
      --line: #d8dee8;
      --soft: #f5f7fa;
      --green: #00c853;
      --green-dark: #08783d;
      --amber: #a96300;
      --red: #b42318;
      --blue: #175cd3;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      background: #e9edf2;
      color: var(--ink);
      font-family: Arial, "Segoe UI", sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body { padding: 24px 0; }

    .report {
      width: 8.5in;
      margin: 0 auto;
    }

    .page {
      width: 8.5in;
      height: 11in;
      padding: 0.38in 0.42in 0.34in;
      margin: 0 auto 24px;
      background: #fff;
      box-shadow: 0 16px 50px rgba(15, 23, 42, 0.13);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      break-after: page;
      page-break-after: always;
    }

    .page:last-child {
      break-after: auto;
      page-break-after: auto;
    }

    .page-body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 10px;
      min-height: 0.52in;
    }

    .brand {
      font-size: 23px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: -0.7px;
    }

    .brand span { color: var(--green); }

    .eyebrow {
      margin-top: 6px;
      color: var(--muted);
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 1.3px;
      text-transform: uppercase;
    }

    .meta-right {
      text-align: right;
      color: var(--muted);
      font-size: 8px;
      line-height: 1.5;
    }

    h1 {
      margin: 16px 0 4px;
      font-size: 27px;
      line-height: 1.12;
      letter-spacing: -0.6px;
    }

    .vehicle-subtitle {
      color: var(--muted);
      font-size: 10px;
      line-height: 1.45;
    }

    .decision {
      margin-top: 15px;
      border: 2px solid ${decision.border};
      background: ${decision.background};
      border-radius: 12px;
      padding: 14px 16px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 1.7in;
      gap: 16px;
      align-items: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .decision-label {
      color: ${decision.color};
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .decision-title {
      margin-top: 5px;
      font-size: 20px;
      line-height: 1.16;
      font-weight: 900;
      color: ${decision.color};
    }

    .decision-copy {
      margin-top: 5px;
      color: #475467;
      font-size: 8.5px;
      line-height: 1.45;
    }

    .bid-box {
      border-left: 1px solid ${decision.border};
      padding-left: 16px;
      text-align: right;
    }

    .bid-box small {
      display: block;
      color: var(--muted);
      font-size: 7px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }

    .bid-box strong {
      display: block;
      margin-top: 4px;
      color: ${decision.color};
      font-size: 25px;
      letter-spacing: -0.6px;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }

    .metric {
      border: 1px solid var(--line);
      border-radius: 9px;
      padding: 10px 11px;
      background: #fff;
      min-height: 0.77in;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .metric .label {
      color: var(--muted);
      font-size: 7.5px;
      font-weight: 700;
      line-height: 1.25;
    }

    .metric .value {
      margin-top: 6px;
      font-size: 17px;
      line-height: 1.1;
      font-weight: 900;
      letter-spacing: -0.35px;
    }

    .metric .value.green { color: var(--green-dark); }
    .metric .value.red { color: var(--red); }

    .metric .note {
      margin-top: 5px;
      color: var(--muted);
      font-size: 6.7px;
      line-height: 1.35;
    }

    .section { margin-top: 13px; }

    .section-title {
      margin: 0 0 7px;
      font-size: 11.5px;
      font-weight: 900;
      letter-spacing: -0.1px;
    }

    .summary {
      border: 1px solid var(--line);
      background: var(--soft);
      border-radius: 9px;
      padding: 11px 13px;
      font-size: 8.7px;
      line-height: 1.55;
      color: #344054;
      max-height: 1.1in;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .facts {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 7px 10px;
    }

    .fact {
      border-bottom: 1px solid var(--line);
      padding: 5px 0 7px;
      min-width: 0;
    }

    .fact .label {
      color: var(--muted);
      font-size: 6.8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.65px;
    }

    .fact .value {
      margin-top: 3px;
      font-size: 8.5px;
      line-height: 1.3;
      font-weight: 700;
      overflow-wrap: anywhere;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .formula {
      margin-top: 11px;
      border: 1px solid var(--line);
      border-radius: 9px;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .formula-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 1.15in;
      gap: 12px;
      padding: 6px 11px;
      border-bottom: 1px solid var(--line);
      font-size: 8px;
      line-height: 1.25;
    }

    .formula-row:last-child {
      border-bottom: 0;
      background: ${decision.background};
      color: ${decision.color};
      font-weight: 900;
      font-size: 9.5px;
    }

    .formula-row span:last-child {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .photo-page-title {
      margin: 13px 0 8px;
      font-size: 15px;
      font-weight: 900;
    }

    .photo-page-copy {
      margin: -3px 0 9px;
      color: var(--muted);
      font-size: 8px;
      line-height: 1.4;
    }

    .photo-table {
      width: 100%;
      height: 8.35in;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: 8px;
      margin: 0;
    }

    .photo-table tr {
      height: 2.72in;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .photo-cell {
      width: 50%;
      height: 2.72in;
      padding: 7px;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: #f4f6f8;
      text-align: center;
      vertical-align: middle;
      overflow: visible;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .photo-frame {
      width: 100%;
      height: 2.48in;
      display: table-cell;
      text-align: center;
      vertical-align: middle;
      background: #eef1f5;
      border-radius: 6px;
      overflow: visible;
    }

    .photo-frame img {
      display: inline-block;
      width: auto !important;
      height: auto !important;
      max-width: 3.55in !important;
      max-height: 2.42in !important;
      object-fit: contain !important;
      object-position: center !important;
      vertical-align: middle;
    }

    .photo-placeholder {
      display: inline-block;
      max-width: 2.7in;
      color: #98a2b3;
      font-size: 8px;
      line-height: 1.45;
      text-align: center;
      padding: 12px;
      vertical-align: middle;
    }

    .evidence-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: repeat(2, 1fr);
      gap: 10px;
      height: 8.9in;
      margin-top: 10px;
    }

    .panel {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 13px 14px;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .panel.warning {
      border-color: #f0c36b;
      background: #fffbeb;
    }

    .panel h3 {
      margin: 0;
      font-size: 10.5px;
      font-weight: 900;
    }

    ul {
      margin: 8px 0 0;
      padding-left: 15px;
    }

    li {
      margin: 0 0 5px;
      color: #475467;
      font-size: 8px;
      line-height: 1.42;
      overflow-wrap: anywhere;
    }

    .comp-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 8px;
    }

    .comp-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .comp-table th,
    .comp-table td {
      border-bottom: 1px solid var(--line);
      padding: 7px 6px;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }

    .comp-table th {
      color: var(--muted);
      font-size: 6.8px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .comp-table td.price {
      color: var(--green-dark);
      font-weight: 900;
      text-align: right;
      white-space: nowrap;
    }

    .comp-table a {
      color: var(--blue);
      text-decoration: none;
    }

    .notes-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px;
      margin-top: 8px;
    }

    .note-card {
      border: 1px solid var(--line);
      border-radius: 9px;
      padding: 10px 11px;
      min-height: 0.86in;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .note-copy {
      color: #344054;
      font-size: 7.8px;
      line-height: 1.42;
      max-height: 0.58in;
      overflow: hidden;
    }

    .note-date {
      margin-top: 6px;
      color: #98a2b3;
      font-size: 6.5px;
    }

    .disclaimer {
      margin-top: 13px;
      border: 1px solid #f0c36b;
      background: #fffbeb;
      border-radius: 9px;
      padding: 11px 13px;
      color: #7a4a00;
      font-size: 7.8px;
      line-height: 1.48;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .no-data {
      padding: 14px;
      border: 1px dashed var(--line);
      border-radius: 9px;
      color: var(--muted);
      font-size: 8px;
      text-align: center;
    }

    .footer {
      flex: 0 0 auto;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 6.4px;
      line-height: 1.38;
      overflow-wrap: anywhere;
    }

    @page {
      size: Letter portrait;
      margin: 0;
    }

    @media print {
      html, body {
        width: 8.5in;
        margin: 0;
        padding: 0;
        background: #fff;
      }

      .report { width: 8.5in; margin: 0; }

      .page {
        width: 8.5in;
        height: 11in;
        margin: 0;
        box-shadow: none;
      }

      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <main class="report">
    <section class="page">
      ${renderHeader(generatedAt, input.analysis.modelName)}
      <div class="page-body">
        <h1>${escapeHtml(input.vehicle.title || "Saved Vehicle")}</h1>
        <div class="vehicle-subtitle">
          ${escapeHtml(
            [
              input.vehicle.titleStatus,
              location || null,
              input.vehicle.lotNumber
                ? `Lot #${input.vehicle.lotNumber}`
                : null,
            ]
              .filter(Boolean)
              .join(" - ")
          )}
        </div>

        <div class="decision">
          <div>
            <div class="decision-label">AI Recommendation</div>
            <div class="decision-title">${escapeHtml(decision.label)}</div>
            <div class="decision-copy">${escapeHtml(decision.copy)}</div>
          </div>
          <div class="bid-box">
            <small>Maximum Bid</small>
            <strong>${money(input.analysis.recommendedBid)}</strong>
          </div>
        </div>

        <div class="metric-grid">
          ${renderMetric(
            "Repaired Resale Value",
            money(input.analysis.marketValueEstimate),
            rangeNote(input.analysis.marketValueLow, input.analysis.marketValueHigh),
            "green"
          )}
          ${renderMetric(
            "Recommended Repair Budget",
            money(input.analysis.repairCostEstimate),
            rangeNote(input.analysis.repairCostLow, input.analysis.repairCostHigh),
            "green"
          )}
          ${renderMetric(
            "Profyt Score",
            input.analysis.profytScore !== null
              ? `${input.analysis.profytScore}/100`
              : "Pending",
            "Opportunity score",
            input.analysis.recommendation === "avoid" ? "red" : ""
          )}
          ${renderMetric(
            "Confidence",
            input.analysis.confidenceScore !== null
              ? `${input.analysis.confidenceScore}%`
              : "-",
            "Strength of market evidence"
          )}
        </div>

        <div class="metric-grid">
          ${renderMetric(
            "Estimated As-Is Value",
            money(input.analysis.asIsValueEstimate),
            rangeNote(input.analysis.asIsValueLow, input.analysis.asIsValueHigh)
          )}
          ${renderMetric(
            "Visible Repair Cost",
            money(input.analysis.visibleRepairCostEstimate),
            rangeNote(
              input.analysis.visibleRepairCostLow,
              input.analysis.visibleRepairCostHigh
            )
          )}
          ${renderMetric(
            "Hidden Damage Contingency",
            money(input.analysis.hiddenDamageContingencyEstimate),
            rangeNote(
              input.analysis.hiddenDamageContingencyLow,
              input.analysis.hiddenDamageContingencyHigh
            )
          )}
          ${renderMetric(
            "Repair Risk",
            formatRisk(input.analysis.repairRisk),
            input.analysis.riskScore !== null
              ? `Risk score ${input.analysis.riskScore}/100`
              : "Risk score unavailable",
            input.analysis.repairRisk === "high" ? "red" : ""
          )}
        </div>

        <div class="section">
          <h2 class="section-title">Analyst Summary</h2>
          <div class="summary">${formatParagraph(summary)}</div>
        </div>

        <div class="section">
          <h2 class="section-title">Vehicle & Auction Snapshot</h2>
          <div class="facts">
            ${renderFact("Mileage", mileage)}
            ${renderFact("Title", input.vehicle.titleStatus || "Not available")}
            ${renderFact("Source", capitalize(input.vehicle.source || "Unknown"))}
            ${renderFact("Lot", input.vehicle.lotNumber || "Not available")}
            ${renderFact("Location", location || "Not available")}
            ${renderFact(
              "Primary Damage",
              input.vehicle.primaryDamage || firstItem(visibleDamage) || "Not available"
            )}
            ${renderFact(
              "Secondary Damage",
              input.vehicle.secondaryDamage || secondItem(visibleDamage) || "Not available"
            )}
            ${renderFact("Run Condition", input.vehicle.runCondition || "Not provided")}
          </div>
        </div>

        <div class="formula">
          ${renderFormulaRow("Repaired resale value", input.analysis.marketValueEstimate)}
          ${renderFormulaRow("Target profit", -Math.abs(input.assumptions.desiredProfit))}
          ${renderFormulaRow("Recommended repair budget", -Math.abs(input.assumptions.repairs))}
          ${renderFormulaRow("Transport", -Math.abs(input.assumptions.transport))}
          ${renderFormulaRow("Auction fees", -Math.abs(input.assumptions.fees))}
          ${renderFormulaRow("AI recommended maximum bid", input.analysis.recommendedBid, true)}
        </div>
      </div>
      ${renderFooter(input.vehicle.auctionUrl, generatedAt, "Page 1 of 4 - Decision Summary")}
    </section>

    <section class="page">
      ${renderHeader(generatedAt, input.analysis.modelName)}
      <div class="page-body">
        <div class="photo-page-title">Auction Photo Evidence</div>
        <div class="photo-page-copy">
          Six auction photos are arranged in a 2 x 3 layout. Every image is scaled down proportionally so the full frame remains visible.
        </div>
        ${renderPhotos(input.photoUrls)}
      </div>
      ${renderFooter(input.vehicle.auctionUrl, generatedAt, "Page 2 of 4 - Photo Evidence")}
    </section>

    <section class="page">
      ${renderHeader(generatedAt, input.analysis.modelName)}
      <div class="page-body">
        <div class="photo-page-title">Damage, Risk & Decision Evidence</div>
        <div class="evidence-grid">
          ${renderListPanel("Visible Damage", visibleDamage, false)}
          ${renderListPanel("Hidden Damage Risks", hiddenRisks, true)}
          ${renderListPanel("Key Factors", keyFactors, false)}
          ${renderListPanel("AI Warnings", warnings, true)}
        </div>
      </div>
      ${renderFooter(input.vehicle.auctionUrl, generatedAt, "Page 3 of 4 - Damage & Risk Review")}
    </section>

    <section class="page">
      ${renderHeader(generatedAt, input.analysis.modelName)}
      <div class="page-body">
        <div class="photo-page-title">Comparable Market Evidence</div>
        ${renderComparableTable(input.analysis.comparableVehicles)}

        ${
          input.notes.length > 0
            ? `<div class="section">
                <h2 class="section-title">Saved Notes</h2>
                ${renderNotes(input.notes)}
              </div>`
            : ""
        }

        <div class="disclaimer">
          <strong>Important:</strong> This report is an AI-assisted estimate, not a mechanical inspection, title guarantee, structural measurement, repair quote, or promise of resale value. Confirm the vehicle, auction terms, title eligibility, fees, transportation, parts availability, labor rates, drivability and hidden damage before bidding.
        </div>
      </div>
      ${renderFooter(input.vehicle.auctionUrl, generatedAt, "Page 4 of 4 - Market Evidence & Notes")}
    </section>
  </main>

  <script>
    (() => {
      let printed = false;

      const printReport = () => {
        if (printed) return;
        printed = true;
        window.focus();
        window.print();
      };

      const imageTasks = Array.from(document.images).map((image) => {
        if (typeof image.decode === "function") {
          return image.decode().catch(() => undefined);
        }

        if (image.complete) return Promise.resolve();

        return new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      });

      const fontTask = document.fonts?.ready ?? Promise.resolve();
      const readiness = Promise.allSettled([fontTask, ...imageTasks]);
      const timeout = new Promise((resolve) => setTimeout(resolve, 12000));

      Promise.race([readiness, timeout]).then(() => {
        requestAnimationFrame(() => setTimeout(printReport, 250));
      });
    })();
  </script>
</body>
</html>`;

  reportWindow.document.open();
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
}

function renderHeader(generatedAt: Date, modelName: string | null) {
  return `<div class="header">
    <div>
      <div class="brand">Profyt<span>ly</span></div>
      <div class="eyebrow">AI Vehicle Decision Report</div>
    </div>
    <div class="meta-right">
      Generated ${escapeHtml(generatedAt.toLocaleString())}<br />
      ${modelName ? `Model ${escapeHtml(modelName)}` : "AI-assisted analysis"}
    </div>
  </div>`;
}

function renderMetric(
  label: string,
  value: string,
  note: string,
  tone: "green" | "red" | "" = ""
) {
  return `<div class="metric">
    <div class="label">${escapeHtml(label)}</div>
    <div class="value ${tone}">${escapeHtml(value)}</div>
    <div class="note">${escapeHtml(note)}</div>
  </div>`;
}

function renderFact(label: string, value: string) {
  return `<div class="fact">
    <div class="label">${escapeHtml(label)}</div>
    <div class="value">${escapeHtml(trimText(value, 150))}</div>
  </div>`;
}

function renderFormulaRow(
  label: string,
  value: number | null,
  isTotal = false
) {
  const formatted =
    value === null
      ? "-"
      : value < 0
        ? `- ${money(Math.abs(value))}`
        : money(value);

  return `<div class="formula-row${isTotal ? " total" : ""}">
    <span>${escapeHtml(label)}</span>
    <span>${escapeHtml(formatted)}</span>
  </div>`;
}

function renderListPanel(title: string, items: string[], warning: boolean) {
  return `<div class="panel${warning ? " warning" : ""}">
    <h3>${escapeHtml(title)}</h3>
    ${
      items.length > 0
        ? `<ul>${items
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("")}</ul>`
        : `<div class="no-data" style="margin-top: 10px">No items available.</div>`
    }
  </div>`;
}

function renderPhotos(photoUrls: string[]) {
  const cleanUrls = Array.from(
    new Set(
      photoUrls.filter(
        (url) => typeof url === "string" && /^https?:\/\//i.test(url.trim())
      )
    )
  ).slice(0, 6);

  const cells = Array.from({ length: 6 }, (_, index) => {
    const url = cleanUrls[index];

    if (!url) {
      return `<td class="photo-cell">
        <div class="photo-frame">
          <span class="photo-placeholder">No additional auction photo was available.</span>
        </div>
      </td>`;
    }

    return `<td class="photo-cell">
      <div class="photo-frame">
        <img
          src="${escapeAttribute(url)}"
          alt="Auction evidence ${index + 1}"
          loading="eager"
          decoding="async"
        />
      </div>
    </td>`;
  });

  const rows = [0, 2, 4]
    .map((start) => `<tr>${cells.slice(start, start + 2).join("")}</tr>`)
    .join("");

  return `<table class="photo-table" aria-label="Auction photo evidence"><tbody>${rows}</tbody></table>`;
}

function renderComparableTable(
  comparables: VehicleAiReportInput["analysis"]["comparableVehicles"]
) {
  const rows = comparables
    .filter(
      (item) =>
        item.price !== null &&
        item.mileage !== null &&
        item.title.trim().length > 0
    )
    .slice(0, 6);

  if (rows.length === 0) {
    return `<div class="no-data">No verified comparable listings were available for this report.</div>`;
  }

  return `<table class="comp-table">
    <thead>
      <tr>
        <th style="width: 41%">Comparable</th>
        <th style="width: 17%">Mileage</th>
        <th style="width: 24%">Location / Source</th>
        <th style="width: 18%; text-align: right">Price</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (item) => `<tr>
            <td>${
              item.url
                ? `<a href="${escapeAttribute(item.url)}">${escapeHtml(
                    trimText(item.title, 120)
                  )}</a>`
                : escapeHtml(trimText(item.title, 120))
            }</td>
            <td>${formatNumber(item.mileage as number)}</td>
            <td>${escapeHtml(
              trimText(
                [item.location, capitalize(item.source)]
                  .filter(Boolean)
                  .join(" - ") || "-",
                100
              )
            )}</td>
            <td class="price">${money(item.price)}</td>
          </tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

function renderNotes(notes: VehicleAiReportInput["notes"]) {
  const cleanNotes = notes.slice(0, 4);

  return `<div class="notes-grid">${cleanNotes
    .map(
      (note) => `<div class="note-card">
        <div class="note-copy">${formatParagraph(
          trimText(note.content, 420)
        )}</div>
        <div class="note-date">${escapeHtml(
          new Date(note.createdAt).toLocaleString()
        )}</div>
      </div>`
    )
    .join("")}</div>`;
}

function renderFooter(
  auctionUrl: string,
  generatedAt: Date,
  pageLabel: string
) {
  return `<div class="footer">
    <strong>${escapeHtml(pageLabel)}</strong> - Generated by Profytly on ${escapeHtml(
      generatedAt.toLocaleString()
    )}. Verify all vehicle, auction, title, fee, transport and repair information before bidding.
    ${
      /^https?:\/\//i.test(auctionUrl)
        ? `<br />Auction reference: <a href="${escapeAttribute(
            auctionUrl
          )}">${escapeHtml(trimText(auctionUrl, 170))}</a>`
        : ""
    }
  </div>`;
}

function getDecisionPresentation(
  recommendation: VehicleAiReportInput["analysis"]["recommendation"],
  recommendedBid: number | null
) {
  const bid =
    recommendedBid !== null && recommendedBid > 0
      ? money(recommendedBid)
      : null;

  if (recommendation === "strong_buy") {
    return {
      label: bid ? `Strong Buy - Max ${bid}` : "Strong Buy",
      copy: "The analyzed margin and risk profile are favorable. Keep the all-in purchase price at or below the recommended maximum bid.",
      color: "#08783d",
      border: "#86d6aa",
      background: "#ecfdf3",
    };
  }

  if (recommendation === "buy") {
    return {
      label: bid ? `Buy Below ${bid}` : "Buy",
      copy: "The opportunity appears economically viable within the current evidence and cost assumptions.",
      color: "#08783d",
      border: "#86d6aa",
      background: "#ecfdf3",
    };
  }

  if (recommendation === "watch") {
    return {
      label: bid ? `Buy With Caution - Max ${bid}` : "Buy With Caution",
      copy: "The deal may work, but limited market evidence or repair uncertainty requires disciplined bidding and inspection.",
      color: "#a15c00",
      border: "#f0c36b",
      background: "#fffbeb",
    };
  }

  if (recommendation === "avoid") {
    return {
      label: "Avoid",
      copy: "No economically viable bid exists under the current resale, repair, fee, transport and profit assumptions.",
      color: "#b42318",
      border: "#f4a7a0",
      background: "#fff1f0",
    };
  }

  return {
    label: "More Data Needed",
    copy: "The available evidence is not sufficient for a defensible bid recommendation.",
    color: "#475467",
    border: "#cfd4dc",
    background: "#f8fafc",
  };
}

function rangeNote(low: number | null, high: number | null) {
  if (low === null || high === null) {
    return "Range unavailable";
  }

  return `${money(low)} - ${money(high)} range`;
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRisk(value: VehicleAiReportInput["analysis"]["repairRisk"]) {
  if (!value || value === "unknown") {
    return "Unknown";
  }

  return capitalize(value);
}

function capitalize(value: string) {
  return value.length > 0
    ? `${value.charAt(0).toUpperCase()}${value.slice(1)}`
    : value;
}

function firstItem(items: string[]) {
  return items.find(Boolean) || null;
}

function secondItem(items: string[]) {
  return items.filter(Boolean)[1] || null;
}

function normalizeItems(items: string[], limit: number, maxLength: number) {
  return Array.from(
    new Set(
      items
        .filter((item) => typeof item === "string" && item.trim().length > 0)
        .map((item) => trimText(item.trim(), maxLength))
    )
  ).slice(0, limit);
}

function trimText(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function formatParagraph(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
