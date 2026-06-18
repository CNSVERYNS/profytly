import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

export type AuctionSource = "copart" | "iaai";
export type AnalysisStatus = "success" | "limited";

export type MileageValue = {
  value: number;
  unit: "miles" | "km" | "unknown";
};

export type AuctionAnalysis = {
  source: AuctionSource;
  auctionUrl: string;
  fetchedUrl: string;

  analysisStatus: AnalysisStatus;
  fetched: boolean;

  lotNumber: string | null;
  title: string;
  vehicleYear: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;

  titleStatus: string | null;
  location: string | null;
  stateCode: string | null;

  mileage: MileageValue | null;
  primaryDamage: string | null;
  secondaryDamage: string | null;
  runCondition: string | null;

  imageUrl: string | null;
  images: string[];

  pageTitle: string | null;
  description: string | null;

  extractedBy: string[];
  warnings: string[];

  analyzedAt: string;
};

type ValidatedAuctionUrl = {
  url: URL;
  source: AuctionSource;
};

type UrlFallbackData = {
  lotNumber: string | null;
  title: string | null;
  vehicleYear: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  titleStatus: string | null;
  location: string | null;
  stateCode: string | null;
};

type StructuredData = {
  name: string | null;
  vehicleYear: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  lotNumber: string | null;
  mileage: MileageValue | null;
  images: string[];
};

type ParsedHtmlData = {
  blocked: boolean;

  pageTitle: string | null;
  description: string | null;

  titleStatus: string | null;
  location: string | null;
  stateCode: string | null;

  mileage: MileageValue | null;
  primaryDamage: string | null;
  secondaryDamage: string | null;
  runCondition: string | null;

  images: string[];
  structured: StructuredData;

  usedMetadata: boolean;
  usedJsonLd: boolean;
  usedPageText: boolean;
};

const MAX_HTML_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/125.0.0.0 Safari/537.36";

const STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];

const PAGE_LABELS = [
  "Lot Number",
  "Stock Number",
  "Odometer",
  "Mileage",
  "Primary Damage",
  "Secondary Damage",
  "Title Code",
  "Title/Sale Doc",
  "Document Type",
  "Sale Location",
  "Branch",
  "Location",
  "Highlights",
  "Run Condition",
  "VIN",
  "Keys",
  "Engine Type",
  "Transmission",
  "Drive",
  "Fuel",
  "Color",
];

export class AuctionUrlError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AuctionUrlError";
    this.statusCode = statusCode;
  }
}

export async function analyzeAuctionUrl(
  rawUrl: unknown
): Promise<AuctionAnalysis> {
  const validated = validateAuctionUrl(rawUrl);
  const fallback = parseUrlFallback(validated);

  const warnings: string[] = [];
  const extractedBy = ["url"];

  let fetched = false;
  let fetchedUrl = validated.url.toString();
  let parsedHtml: ParsedHtmlData | null = null;

  try {
    const fetchedPage = await fetchAuctionHtml(validated);

    fetched = true;
    fetchedUrl = fetchedPage.finalUrl;

    parsedHtml = parseAuctionHtml(
      fetchedPage.html,
      fetchedPage.finalUrl
    );

    if (parsedHtml.blocked) {
      warnings.push(
        "The auction site returned a verification or blocked page. URL fallback data was used."
      );
    } else {
      if (parsedHtml.usedMetadata) {
        extractedBy.push("metadata");
      }

      if (parsedHtml.usedJsonLd) {
        extractedBy.push("json-ld");
      }

      if (parsedHtml.usedPageText) {
        extractedBy.push("page-text");
      }
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The auction page could not be fetched.";

    warnings.push(
      `${message} URL fallback data was used instead.`
    );
  }

  const usableHtml =
    parsedHtml && !parsedHtml.blocked ? parsedHtml : null;

  const structured = usableHtml?.structured;

  const titleSource =
    structured?.name ||
    usableHtml?.pageTitle ||
    fallback.title ||
    null;

  const titleVehicle = parseVehicleTitle(titleSource);

  const vehicleYear =
    structured?.vehicleYear ||
    titleVehicle.vehicleYear ||
    fallback.vehicleYear;

  const vehicleMake =
    structured?.vehicleMake ||
    titleVehicle.vehicleMake ||
    fallback.vehicleMake;

  const vehicleModel =
    structured?.vehicleModel ||
    titleVehicle.vehicleModel ||
    fallback.vehicleModel;

  const lotNumber =
    normalizeLotNumber(structured?.lotNumber) ||
    fallback.lotNumber;

  const location =
    usableHtml?.location || fallback.location;

  const stateCode =
    usableHtml?.stateCode ||
    fallback.stateCode ||
    extractStateCode(location);

  const titleStatus =
    usableHtml?.titleStatus ||
    fallback.titleStatus;

  const title = buildVehicleTitle({
    source: validated.source,
    lotNumber,
    vehicleYear,
    vehicleMake,
    vehicleModel,
    fallbackTitle: fallback.title,
    pageTitle: usableHtml?.pageTitle || null,
  });

  const images = uniqueHttpUrls(
    [
      ...(structured?.images || []),
      ...(usableHtml?.images || []),
    ],
    fetchedUrl
  ).slice(0, 8);

  const imageUrl = images[0] || null;

  const mileage =
    structured?.mileage ||
    usableHtml?.mileage ||
    null;

  if (!vehicleYear || !vehicleMake || !vehicleModel) {
    warnings.push(
      "Full year, make and model could not be confirmed."
    );
  }

  if (!imageUrl) {
    warnings.push("No vehicle image was found.");
  }

  if (!mileage) {
    warnings.push("Mileage was not found.");
  }

  const analysisStatus: AnalysisStatus =
    fetched &&
    Boolean(usableHtml) &&
    Boolean(vehicleYear && vehicleMake && vehicleModel) &&
    Boolean(imageUrl)
      ? "success"
      : "limited";

  return {
    source: validated.source,
    auctionUrl: validated.url.toString(),
    fetchedUrl,

    analysisStatus,
    fetched,

    lotNumber,
    title,
    vehicleYear,
    vehicleMake,
    vehicleModel,

    titleStatus,
    location,
    stateCode,

    mileage,
    primaryDamage: usableHtml?.primaryDamage || null,
    secondaryDamage: usableHtml?.secondaryDamage || null,
    runCondition: usableHtml?.runCondition || null,

    imageUrl,
    images,

    pageTitle: usableHtml?.pageTitle || null,
    description: usableHtml?.description || null,

    extractedBy: Array.from(new Set(extractedBy)),
    warnings: Array.from(new Set(warnings)),

    analyzedAt: new Date().toISOString(),
  };
}

export function validateAuctionUrl(
  rawUrl: unknown
): ValidatedAuctionUrl {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new AuctionUrlError(
      "A Copart or IAAI URL is required."
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    throw new AuctionUrlError("The auction URL is not valid.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new AuctionUrlError(
      "Only secure HTTPS auction URLs are allowed."
    );
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new AuctionUrlError(
      "Auction URLs containing credentials are not allowed."
    );
  }

  if (parsedUrl.port && parsedUrl.port !== "443") {
    throw new AuctionUrlError(
      "Custom ports are not allowed."
    );
  }

  const hostname = parsedUrl.hostname
    .toLowerCase()
    .replace(/\.$/, "");

  let source: AuctionSource | null = null;

  if (
    hostname === "copart.com" ||
    hostname.endsWith(".copart.com")
  ) {
    source = "copart";
  }

  if (
    hostname === "iaai.com" ||
    hostname.endsWith(".iaai.com")
  ) {
    source = "iaai";
  }

  if (!source) {
    throw new AuctionUrlError(
      "Only Copart and IAAI vehicle URLs are supported."
    );
  }

  return {
    url: parsedUrl,
    source,
  };
}

async function fetchAuctionHtml(
  initial: ValidatedAuctionUrl
): Promise<{
  html: string;
  finalUrl: string;
}> {
  let currentUrl = initial.url;

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new Error(
          "The auction page request timed out."
        );
      }

      throw new Error(
        "The auction page request could not be completed."
      );
    } finally {
      clearTimeout(timeout);
    }

    if (isRedirectStatus(response.status)) {
      if (redirectCount >= MAX_REDIRECTS) {
        throw new Error(
          "The auction page exceeded the redirect limit."
        );
      }

      const location = response.headers.get("location");

      if (!location) {
        throw new Error(
          "The auction site returned an invalid redirect."
        );
      }

      const nextUrl = new URL(location, currentUrl);
      const validatedRedirect = validateAuctionUrl(
        nextUrl.toString()
      );

      if (validatedRedirect.source !== initial.source) {
        throw new Error(
          "The auction page redirected to an unsupported domain."
        );
      }

      currentUrl = validatedRedirect.url;
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `The auction site returned HTTP ${response.status}.`
      );
    }

    const contentType = (
      response.headers.get("content-type") || ""
    ).toLowerCase();

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      throw new Error(
        "The auction URL did not return an HTML vehicle page."
      );
    }

    const contentLengthHeader =
      response.headers.get("content-length");

    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);

      if (
        Number.isFinite(contentLength) &&
        contentLength > MAX_HTML_BYTES
      ) {
        throw new Error(
          "The auction page response was too large."
        );
      }
    }

    const html = await readLimitedResponse(
      response,
      MAX_HTML_BYTES
    );

    if (!html.trim()) {
      throw new Error(
        "The auction site returned an empty page."
      );
    }

    return {
      html,
      finalUrl: currentUrl.toString(),
    };
  }

  throw new Error(
    "The auction page could not be fetched."
  );
}

async function readLimitedResponse(
  response: Response,
  maximumBytes: number
) {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let totalBytes = 0;
  let output = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maximumBytes) {
      await reader.cancel();

      throw new Error(
        "The auction page response was too large."
      );
    }

    output += decoder.decode(value, {
      stream: true,
    });
  }

  output += decoder.decode();

  return output;
}

function parseAuctionHtml(
  html: string,
  baseUrl: string
): ParsedHtmlData {
  const $ = cheerio.load(html);

  const pageTitle = firstNonEmpty(
    getMetaContent($, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
    ]),
    $("title").first().text()
  );

  const description = firstNonEmpty(
    getMetaContent($, [
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ])
  );

  const metadataImages = [
    getMetaContent($, [
      'meta[property="og:image"]',
      'meta[property="og:image:secure_url"]',
    ]),
    getMetaContent($, [
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
    ]),
    $('link[rel="image_src"]').first().attr("href"),
  ].filter((value): value is string => Boolean(value));

  const jsonLdValues = readJsonLd($);
  const structured = extractStructuredData(jsonLdValues);

  const bodyClone = $("body").clone();

  bodyClone
    .find("script, style, noscript, svg")
    .remove();

  const bodyText = normalizeWhitespace(bodyClone.text());

  const blocked = isBlockedPage(
    pageTitle,
    bodyText
  );

  if (blocked) {
    return {
      blocked: true,

      pageTitle,
      description,

      titleStatus: null,
      location: null,
      stateCode: null,

      mileage: null,
      primaryDamage: null,
      secondaryDamage: null,
      runCondition: null,

      images: [],
      structured: emptyStructuredData(),

      usedMetadata: false,
      usedJsonLd: false,
      usedPageText: false,
    };
  }

  const titleStatus = firstNonEmpty(
    extractLabeledValue(bodyText, [
      "Title/Sale Doc",
      "Title Code",
      "Document Type",
    ])
  );

  const location = firstNonEmpty(
    extractLabeledValue(bodyText, [
      "Sale Location",
      "Branch",
      "Location",
    ])
  );

  const primaryDamage = firstNonEmpty(
    extractLabeledValue(bodyText, [
      "Primary Damage",
    ])
  );

  const secondaryDamage = firstNonEmpty(
    extractLabeledValue(bodyText, [
      "Secondary Damage",
    ])
  );

  const mileage = extractMileage(bodyText);

  const runCondition = detectRunCondition(
    bodyText
  );

  const images = uniqueHttpUrls(
    [
      ...metadataImages,
      ...structured.images,
    ],
    baseUrl
  );

  return {
    blocked: false,

    pageTitle,
    description,

    titleStatus,
    location,
    stateCode: extractStateCode(location),

    mileage,
    primaryDamage,
    secondaryDamage,
    runCondition,

    images,
    structured,

    usedMetadata: Boolean(
      pageTitle ||
        description ||
        metadataImages.length
    ),

    usedJsonLd: jsonLdValues.length > 0,

    usedPageText: Boolean(
      titleStatus ||
        location ||
        mileage ||
        primaryDamage ||
        secondaryDamage ||
        runCondition
    ),
  };
}

function getMetaContent(
  $: CheerioAPI,
  selectors: string[]
) {
  for (const selector of selectors) {
    const element = $(selector).first();

    const value =
      element.attr("content") ||
      element.attr("href");

    if (value?.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readJsonLd($: CheerioAPI): unknown[] {
  const values: unknown[] = [];

  $('script[type="application/ld+json"]').each(
    (_, element) => {
      const rawValue = $(element).html();

      if (!rawValue?.trim()) {
        return;
      }

      try {
        const parsed = JSON.parse(rawValue);

        if (Array.isArray(parsed)) {
          values.push(...parsed);
        } else {
          values.push(parsed);
        }
      } catch {
        // Invalid JSON-LD blocks are ignored.
      }
    }
  );

  return values;
}

function extractStructuredData(
  jsonLdValues: unknown[]
): StructuredData {
  const records: Record<string, unknown>[] = [];

  for (const value of jsonLdValues) {
    collectJsonRecords(value, records, 0);
  }

  if (records.length === 0) {
    return emptyStructuredData();
  }

  const rankedRecords = records
    .map((record) => ({
      record,
      score: scoreStructuredRecord(record),
    }))
    .sort((a, b) => b.score - a.score);

  const bestRecord = rankedRecords[0]?.record;

  if (!bestRecord) {
    return emptyStructuredData();
  }

  const name = asString(bestRecord.name);

  const make = firstNonEmpty(
    readNamedValue(bestRecord.brand),
    readNamedValue(bestRecord.manufacturer),
    asString(bestRecord.vehicleMake)
  );

  const model = firstNonEmpty(
    readNamedValue(bestRecord.model),
    asString(bestRecord.vehicleModel),
    asString(bestRecord.vehicleConfiguration)
  );

  const vehicleYear = findYear(
    bestRecord.vehicleModelDate,
    bestRecord.modelDate,
    bestRecord.releaseDate,
    bestRecord.productionDate,
    name
  );

  const lotNumber = normalizeLotNumber(
    firstNonEmpty(
      asString(bestRecord.sku),
      asString(bestRecord.productID),
      asString(bestRecord.identifier)
    )
  );

  const mileage = extractStructuredMileage(
    bestRecord.mileageFromOdometer
  );

  const imageCandidates: string[] = [];

  for (const ranked of rankedRecords.slice(0, 20)) {
    imageCandidates.push(
      ...extractImageCandidates(
        ranked.record.image
      )
    );
  }

  return {
    name,
    vehicleYear,
    vehicleMake: make
      ? titleCase(make)
      : null,
    vehicleModel: model
      ? titleCase(model)
      : null,
    lotNumber,
    mileage,
    images: Array.from(
      new Set(imageCandidates)
    ),
  };
}

function collectJsonRecords(
  value: unknown,
  output: Record<string, unknown>[],
  depth: number
) {
  if (depth > 7 || output.length >= 500) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonRecords(
        item,
        output,
        depth + 1
      );
    }

    return;
  }

  if (!isRecord(value)) {
    return;
  }

  output.push(value);

  for (const nestedValue of Object.values(value)) {
    collectJsonRecords(
      nestedValue,
      output,
      depth + 1
    );
  }
}

function scoreStructuredRecord(
  record: Record<string, unknown>
) {
  let score = 0;

  const types = Array.isArray(record["@type"])
    ? record["@type"]
    : [record["@type"]];

  const normalizedTypes = types
    .map(asString)
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  if (
    normalizedTypes.some((type) =>
      ["vehicle", "car", "product"].includes(type)
    )
  ) {
    score += 10;
  }

  if (record.name) score += 3;
  if (record.image) score += 3;
  if (record.brand) score += 2;
  if (record.model) score += 2;
  if (record.vehicleModelDate) score += 2;
  if (record.mileageFromOdometer) score += 2;
  if (record.sku) score += 1;

  return score;
}

function extractStructuredMileage(
  value: unknown
): MileageValue | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawValue = firstNonEmpty(
    asString(value.value),
    asString(value.minValue),
    asString(value.maxValue)
  );

  if (!rawValue) {
    return null;
  }

  const number = Number(
    rawValue.replaceAll(",", "")
  );

  if (!Number.isFinite(number)) {
    return null;
  }

  const unitValue = firstNonEmpty(
    asString(value.unitText),
    asString(value.unitCode)
  );

  return {
    value: number,
    unit: normalizeMileageUnit(unitValue),
  };
}

function extractImageCandidates(
  value: unknown
): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      extractImageCandidates(item)
    );
  }

  if (isRecord(value)) {
    return [
      ...extractImageCandidates(value.url),
      ...extractImageCandidates(value.contentUrl),
      ...extractImageCandidates(value.thumbnailUrl),
    ];
  }

  return [];
}

function extractMileage(
  bodyText: string
): MileageValue | null {
  const labeledMileage = extractLabeledValue(
    bodyText,
    ["Odometer", "Mileage"]
  );

  if (!labeledMileage) {
    return null;
  }

  const match = labeledMileage.match(
    /([\d,.]+)\s*(mi|mile|miles|km|kilometer|kilometers)?/i
  );

  if (!match) {
    return null;
  }

  const number = Number(
    match[1].replaceAll(",", "")
  );

  if (!Number.isFinite(number)) {
    return null;
  }

  return {
    value: number,
    unit: normalizeMileageUnit(match[2]),
  };
}

function normalizeMileageUnit(
  value: string | null | undefined
): MileageValue["unit"] {
  const normalized = (
    value || ""
  ).toLowerCase();

  if (
    normalized.includes("mi") ||
    normalized === "smi"
  ) {
    return "miles";
  }

  if (
    normalized.includes("km") ||
    normalized === "kmt"
  ) {
    return "km";
  }

  return "unknown";
}

function detectRunCondition(
  bodyText: string
) {
  if (/run\s*(?:&|and)\s*drive/i.test(bodyText)) {
    return "Run and Drive";
  }

  if (/engine start program/i.test(bodyText)) {
    return "Engine Start Program";
  }

  if (/stationary/i.test(bodyText)) {
    return "Stationary";
  }

  if (/enhanced vehicles?/i.test(bodyText)) {
    return "Enhanced Vehicle";
  }

  return firstNonEmpty(
    extractLabeledValue(bodyText, [
      "Run Condition",
      "Highlights",
    ])
  );
}

function extractLabeledValue(
  bodyText: string,
  labels: string[]
) {
  const stopPattern = PAGE_LABELS.map(
    escapeRegExp
  ).join("|");

  for (const label of labels) {
    const pattern = new RegExp(
      `${escapeRegExp(
        label
      )}\\s*:?\\s*(.{1,140}?)(?=\\s+(?:${stopPattern})\\s*:?|$)`,
      "i"
    );

    const match = bodyText.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const value = cleanExtractedValue(
      match[1]
    );

    if (value) {
      return value;
    }
  }

  return null;
}

function cleanExtractedValue(value: string) {
  const cleaned = normalizeWhitespace(value)
    .replace(/^[\s:|-]+/, "")
    .replace(/[\s|]+$/, "")
    .trim();

  if (!cleaned || cleaned.length > 100) {
    return null;
  }

  return cleaned;
}

function parseUrlFallback(
  validated: ValidatedAuctionUrl
): UrlFallbackData {
  const lotNumber = extractLotNumber(
    validated.url,
    validated.source
  );

  if (validated.source !== "copart") {
    return {
      lotNumber,
      title: lotNumber
        ? `IAAI Lot ${lotNumber}`
        : null,

      vehicleYear: null,
      vehicleMake: null,
      vehicleModel: null,

      titleStatus: null,
      location: null,
      stateCode: null,
    };
  }

  const pathParts = validated.url.pathname
    .split("/")
    .filter(Boolean);

  const lotIndex = pathParts.findIndex(
    (part) => part.toLowerCase() === "lot"
  );

  const slug =
    lotIndex >= 0
      ? pathParts[lotIndex + 2] || ""
      : "";

  if (!slug) {
    return {
      lotNumber,
      title: lotNumber
        ? `COPART Lot ${lotNumber}`
        : null,

      vehicleYear: null,
      vehicleMake: null,
      vehicleModel: null,

      titleStatus: null,
      location: null,
      stateCode: null,
    };
  }

  const slugParts = slug
    .split("-")
    .filter(Boolean);

  const yearIndex = slugParts.findIndex((part) =>
    /^(19|20)\d{2}$/.test(part)
  );

  if (yearIndex < 0) {
    return {
      lotNumber,
      title: lotNumber
        ? `COPART Lot ${lotNumber}`
        : null,

      vehicleYear: null,
      vehicleMake: null,
      vehicleModel: null,

      titleStatus: null,
      location: null,
      stateCode: null,
    };
  }

  const vehicleYear = slugParts[yearIndex];
  const beforeYear = slugParts.slice(0, yearIndex);
  const afterYear = slugParts.slice(yearIndex + 1);

  const vehicleMake = afterYear[0]
    ? titleCase(afterYear[0])
    : null;

  const stateIndex = afterYear.findIndex((part) =>
    STATE_CODES.includes(part.toUpperCase())
  );

  let vehicleModel: string | null = null;
  let location: string | null = null;
  let stateCode: string | null = null;

  if (stateIndex >= 0) {
    stateCode =
      afterYear[stateIndex].toUpperCase();

    vehicleModel = firstNonEmpty(
      titleCase(
        afterYear
          .slice(1, stateIndex)
          .join(" ")
      )
    );

    location = firstNonEmpty(
      titleCase(
        afterYear
          .slice(stateIndex + 1)
          .join(" ")
      )
    );
  } else {
    vehicleModel = firstNonEmpty(
      titleCase(afterYear.slice(1).join(" "))
    );
  }

  const titleStatus = firstNonEmpty(
    titleCase(beforeYear.join(" "))
  );

  const title =
    vehicleYear &&
    vehicleMake &&
    vehicleModel
      ? `${vehicleYear} ${vehicleMake} ${vehicleModel}`
      : lotNumber
        ? `COPART Lot ${lotNumber}`
        : null;

  return {
    lotNumber,
    title,

    vehicleYear,
    vehicleMake,
    vehicleModel,

    titleStatus,
    location,
    stateCode,
  };
}

function extractLotNumber(
  url: URL,
  source: AuctionSource
) {
  const pathname = url.pathname;

  if (source === "copart") {
    const match = pathname.match(
      /\/lot\/(\d+)/i
    );

    return match?.[1] || null;
  }

  const iaaiMatch =
    pathname.match(/\/vehicledetail\/(\d+)/i) ||
    pathname.match(/\/lot\/(\d+)/i);

  if (iaaiMatch?.[1]) {
    return iaaiMatch[1];
  }

  const queryValue =
    url.searchParams.get("itemid") ||
    url.searchParams.get("stockno") ||
    url.searchParams.get("stockNo");

  return normalizeLotNumber(queryValue);
}

function parseVehicleTitle(
  value: string | null | undefined
) {
  if (!value) {
    return {
      vehicleYear: null,
      vehicleMake: null,
      vehicleModel: null,
    };
  }

  const cleaned = cleanPageTitle(value);

  const match = cleaned.match(
    /\b((?:19|20)\d{2})\s+([A-Za-z0-9.-]+)\s+(.+)/i
  );

  if (!match) {
    return {
      vehicleYear: null,
      vehicleMake: null,
      vehicleModel: null,
    };
  }

  const vehicleYear = match[1];

  const vehicleMake = titleCase(match[2]);

  const rawModel = match[3]
    .replace(
      /\s+(?:for sale|at auction|vehicle details?).*$/i,
      ""
    )
    .replace(/\s+\|\s+.*$/, "")
    .trim();

  const vehicleModel = rawModel
    ? titleCase(rawModel)
    : null;

  return {
    vehicleYear,
    vehicleMake,
    vehicleModel,
  };
}

function cleanPageTitle(value: string) {
  return normalizeWhitespace(value)
    .replace(/\s*\|\s*Copart.*$/i, "")
    .replace(/\s*\|\s*IAAI.*$/i, "")
    .replace(/\s*-\s*Copart.*$/i, "")
    .replace(/\s*-\s*IAAI.*$/i, "")
    .trim();
}

function buildVehicleTitle({
  source,
  lotNumber,
  vehicleYear,
  vehicleMake,
  vehicleModel,
  fallbackTitle,
  pageTitle,
}: {
  source: AuctionSource;
  lotNumber: string | null;
  vehicleYear: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  fallbackTitle: string | null;
  pageTitle: string | null;
}) {
  if (
    vehicleYear &&
    vehicleMake &&
    vehicleModel
  ) {
    return `${vehicleYear} ${vehicleMake} ${vehicleModel}`;
  }

  const cleanedPageTitle = pageTitle
    ? cleanPageTitle(pageTitle)
    : null;

  return (
    firstNonEmpty(
      fallbackTitle,
      cleanedPageTitle
    ) ||
    (lotNumber
      ? `${source.toUpperCase()} Lot ${lotNumber}`
      : "Saved Vehicle")
  );
}

function uniqueHttpUrls(
  values: Array<string | null | undefined>,
  baseUrl: string
) {
  const results: string[] = [];

  for (const value of values) {
    if (!value?.trim()) {
      continue;
    }

    try {
      const parsed = new URL(
        value.trim(),
        baseUrl
      );

      if (
        parsed.protocol !== "http:" &&
        parsed.protocol !== "https:"
      ) {
        continue;
      }

      results.push(parsed.toString());
    } catch {
      // Invalid image URLs are ignored.
    }
  }

  return Array.from(new Set(results));
}

function extractStateCode(
  location: string | null | undefined
) {
  if (!location) {
    return null;
  }

  const match = location
    .toUpperCase()
    .match(
      new RegExp(
        `(?:,|\\s)(${STATE_CODES.join(
          "|"
        )})(?:\\s|$)`
      )
    );

  return match?.[1] || null;
}

function isBlockedPage(
  pageTitle: string | null,
  bodyText: string
) {
  const combined = `${pageTitle || ""} ${bodyText}`
    .toLowerCase()
    .slice(0, 20_000);

  return [
    "access denied",
    "request unsuccessful",
    "verify you are human",
    "are you a human",
    "just a moment",
    "captcha",
    "temporarily blocked",
    "automated access",
    "forbidden",
  ].some((phrase) => combined.includes(phrase));
}

function findYear(...values: unknown[]) {
  for (const value of values) {
    const text = asString(value);

    if (!text) {
      continue;
    }

    const match = text.match(/\b(19|20)\d{2}\b/);

    if (match) {
      return match[0];
    }
  }

  return null;
}

function normalizeLotNumber(
  value: string | null | undefined
) {
  if (!value) {
    return null;
  }

  const match = value.match(/\d{5,}/);

  return match?.[0] || null;
}

function readNamedValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (!isRecord(value)) {
    return null;
  }

  return firstNonEmpty(
    asString(value.name),
    asString(value.value)
  );
}

function asString(
  value: unknown
): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function firstNonEmpty(
  ...values: Array<string | null | undefined>
) {
  for (const value of values) {
    if (value?.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  const upperWords = new Set([
    "LX",
    "EX",
    "SE",
    "LE",
    "XLE",
    "AWD",
    "FWD",
    "RWD",
    "SUV",
    "EV",
    "GT",
    "GTI",
    "VIN",
  ]);

  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();

      if (upperWords.has(upper)) {
        return upper;
      }

      return (
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
      );
    })
    .join(" ");
}

function emptyStructuredData(): StructuredData {
  return {
    name: null,
    vehicleYear: null,
    vehicleMake: null,
    vehicleModel: null,
    lotNumber: null,
    mileage: null,
    images: [],
  };
}

function isRedirectStatus(status: number) {
  return [301, 302, 303, 307, 308].includes(
    status
  );
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function escapeRegExp(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}