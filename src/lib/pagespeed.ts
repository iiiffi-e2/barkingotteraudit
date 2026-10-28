import {
  MetricStatus,
  NormalizedLabMetric,
  NormalizedLabMetricsMap,
  NormalizedOpportunity,
} from "@/types/audit";
import {
  extractAndPrioritizeOpportunities,
  RawLighthouseAudit,
} from "@/lib/opportunities";
import { formatDurationMs } from "@/lib/utils";
import crypto from "crypto";

export interface ParsedPageSpeedRun {
  device: "MOBILE" | "DESKTOP";
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lighthouseVersion: string | null;
  fetchedAt: Date;
  requestedUrl: string;
  finalUrl: string;
  metrics: NormalizedLabMetricsMap;
  opportunities: NormalizedOpportunity[];
  warnings: string[];
  runtimeError: { code?: string; message?: string } | null;
  configSettings: Record<string, unknown> | null;
  detectedPlatform: string | null;
  platformSignals: string[];
  isDemoMode: boolean;
}

export class PageSpeedApiError extends Error {
  public readonly code:
    | "RATE_LIMITED"
    | "TIMEOUT"
    | "SITE_UNREACHABLE"
    | "BLOCKED_BY_SITE"
    | "INVALID_RESPONSE"
    | "API_ERROR";
  public readonly statusCode?: number;

  constructor(
    code:
      | "RATE_LIMITED"
      | "TIMEOUT"
      | "SITE_UNREACHABLE"
      | "BLOCKED_BY_SITE"
      | "INVALID_RESPONSE"
      | "API_ERROR",
    message: string,
    statusCode?: number
  ) {
    super(message);
    this.name = "PageSpeedApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function classifyMetricThreshold(
  numericValue: number | null,
  goodMax: number,
  poorMin: number
): MetricStatus {
  if (numericValue === null || !Number.isFinite(numericValue)) return "unknown";
  if (numericValue <= goodMax) return "good";
  if (numericValue <= poorMin) return "needs-improvement";
  return "poor";
}

function buildLabMetric(
  id: NormalizedLabMetric["id"],
  acronym: string,
  label: string,
  plainDescription: string,
  detailedExplanation: string,
  audit: RawLighthouseAudit | undefined,
  unit: "ms" | "s" | "unitless",
  goodMax: number,
  poorMin: number,
  thresholds: { good: string; poor: string }
): NormalizedLabMetric {
  const rawVal =
    typeof audit?.numericValue === "number" && Number.isFinite(audit.numericValue)
      ? audit.numericValue
      : null;

  let displayValue = audit?.displayValue || "Unavailable";
  if (rawVal !== null && (!audit?.displayValue || audit.displayValue.trim() === "")) {
    if (unit === "s") {
      displayValue = `${(rawVal / 1000).toFixed(1)} s`;
    } else if (unit === "ms") {
      displayValue = `${Math.round(rawVal)} ms`;
    } else {
      displayValue = rawVal.toFixed(3).replace(/\.?0+$/, "") || "0";
    }
  }

  const score =
    typeof audit?.score === "number" && Number.isFinite(audit.score)
      ? audit.score
      : null;

  return {
    id,
    acronym,
    label,
    plainDescription,
    detailedExplanation,
    numericValue: rawVal,
    unit,
    displayValue,
    score,
    status: classifyMetricThreshold(rawVal, goodMax, poorMin),
    thresholds,
  };
}

export function extractLabMetricsFromAudits(
  audits: Record<string, RawLighthouseAudit> | undefined
): NormalizedLabMetricsMap {
  const safeAudits = audits || {};

  // Current Lighthouse methodology thresholds (LCP: <=2500ms good, >4000ms poor; FCP: <=1800ms good, >3000ms poor; TBT: <=200ms good, >600ms poor; CLS: <=0.1 good, >0.25 poor; SI: <=3400ms good, >5800ms poor)
  const lcp = buildLabMetric(
    "largest-contentful-paint",
    "LCP",
    "Largest Contentful Paint (LCP)",
    "How long it takes the main content to appear.",
    "Measures when the largest image or headline block in the initial viewport becomes visible. A fast LCP reassures visitors that the page is useful and loading properly.",
    safeAudits["largest-contentful-paint"],
    "s",
    2500,
    4000,
    { good: "≤ 2.5 s", poor: "> 4.0 s" }
  );

  const fcp = buildLabMetric(
    "first-contentful-paint",
    "FCP",
    "First Contentful Paint (FCP)",
    "How quickly the first content becomes visible.",
    "Measures the time from navigation until the browser renders the first piece of text or image on the screen.",
    safeAudits["first-contentful-paint"],
    "s",
    1800,
    3000,
    { good: "≤ 1.8 s", poor: "> 3.0 s" }
  );

  const tbt = buildLabMetric(
    "total-blocking-time",
    "TBT",
    "Total Blocking Time (TBT)",
    "How much the page is delayed by busy browser tasks.",
    "Measures the total amount of laboratory time between First Contentful Paint and Time to Interactive where the browser main thread was blocked for long enough (>50 ms) to prevent input responsiveness. Note: TBT is a laboratory diagnostic metric, not real-user INP.",
    safeAudits["total-blocking-time"],
    "ms",
    200,
    600,
    { good: "≤ 200 ms", poor: "> 600 ms" }
  );

  const cls = buildLabMetric(
    "cumulative-layout-shift",
    "CLS",
    "Cumulative Layout Shift (CLS)",
    "How much the page unexpectedly moves while loading.",
    "Measures visual stability by quantifying unexpected layout shifts of visible page elements during loading.",
    safeAudits["cumulative-layout-shift"],
    "unitless",
    0.1,
    0.25,
    { good: "≤ 0.10", poor: "> 0.25" }
  );

  const speedIndex = buildLabMetric(
    "speed-index",
    "SI",
    "Speed Index",
    "How quickly visible content fills the screen.",
    "Measures how quickly the visual contents of a page are visibly populated during page load.",
    safeAudits["speed-index"],
    "s",
    3400,
    5800,
    { good: "≤ 3.4 s", poor: "> 5.8 s" }
  );

  const ttfb = safeAudits["server-response-time"]
    ? buildLabMetric(
        "server-response-time",
        "TTFB",
        "Initial Server Response Time",
        "How quickly your web server sends back the first byte of HTML.",
        "Measures the time it takes for the origin server or CDN to respond to the initial document request.",
        safeAudits["server-response-time"],
        "ms",
        600,
        1200,
        { good: "≤ 600 ms", poor: "> 1200 ms" }
      )
    : undefined;

  const interactive = safeAudits["interactive"]
    ? buildLabMetric(
        "interactive",
        "TTI",
        "Time to Interactive",
        "When the page becomes reliably ready for user interaction.",
        "Measures how long it takes a page to become fully interactive in a controlled lab test.",
        safeAudits["interactive"],
        "s",
        3800,
        7300,
        { good: "≤ 3.8 s", poor: "> 7.3 s" }
      )
    : undefined;

  return {
    lcp,
    fcp,
    tbt,
    cls,
    speedIndex,
    ttfb,
    interactive,
  };
}

export function detectPlatformFromLighthouse(
  lighthouseResult: Record<string, unknown>
): { platform: string | null; signals: string[] } {
  const signals: string[] = [];
  let platform: string | null = null;

  // 1. Check Lighthouse stackPacks if present (official Lighthouse signal)
  const stackPacks = lighthouseResult.stackPacks as
    | Array<{ id?: string; title?: string }>
    | undefined;
  if (Array.isArray(stackPacks) && stackPacks.length > 0) {
    for (const pack of stackPacks) {
      if (pack.title) {
        signals.push(`Lighthouse Stack Pack: ${pack.title}`);
        if (!platform) platform = pack.title;
      }
    }
  }

  // 2. Inspect network-requests or asset URLs in audits for defensible platform signatures
  const audits = lighthouseResult.audits as Record<string, RawLighthouseAudit> | undefined;
  if (audits) {
    const inspectedUrls: string[] = [];
    for (const audit of Object.values(audits)) {
      const items = audit?.details?.items;
      if (Array.isArray(items)) {
        for (const item of items.slice(0, 25)) {
          if (typeof item.url === "string") {
            inspectedUrls.push(item.url.toLowerCase());
          }
        }
      }
    }

    const joined = inspectedUrls.join(" ");
    if (joined.includes("/wp-content/") || joined.includes("/wp-includes/")) {
      platform = platform || "WordPress";
      signals.push("Detected /wp-content/ or /wp-includes/ asset paths");
    } else if (joined.includes("cdn.shopify.com") || joined.includes("shopify.com/s/files")) {
      platform = platform || "Shopify";
      signals.push("Detected cdn.shopify.com asset delivery");
    } else if (joined.includes("/_next/static/")) {
      platform = platform || "Next.js";
      signals.push("Detected /_next/static/ build chunks");
    } else if (
      joined.includes("assets.website-files.com") ||
      joined.includes("cdn.prod.website-files.com")
    ) {
      platform = platform || "Webflow";
      signals.push("Detected Webflow CDN asset signatures");
    } else if (joined.includes("static1.squarespace.com") || joined.includes("squarespace.com")) {
      platform = platform || "Squarespace";
      signals.push("Detected Squarespace static asset delivery");
    } else if (joined.includes("static.parastorage.com") || joined.includes("wixstatic.com")) {
      platform = platform || "Wix";
      signals.push("Detected Wix parastorage/wixstatic assets");
    } else if (joined.includes("/_astro/")) {
      platform = platform || "Astro";
      signals.push("Detected /_astro/ bundle paths");
    }
  }

  return {
    platform,
    signals: Array.from(new Set(signals)),
  };
}

function extractCategoryScore(
  categories: Record<string, { score?: number | null } | undefined> | undefined,
  key: string
): number | null {
  const raw = categories?.[key]?.score;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return null;
  }
  return Math.round(raw * 100);
}

export function parsePageSpeedApiResponse(
  rawData: unknown,
  device: "MOBILE" | "DESKTOP",
  fallbackUrl: string
): ParsedPageSpeedRun {
  if (!rawData || typeof rawData !== "object") {
    throw new PageSpeedApiError(
      "INVALID_RESPONSE",
      "Received an empty or invalid response from PageSpeed Insights."
    );
  }

  const root = rawData as Record<string, unknown>;
  const lighthouseResult = root.lighthouseResult as Record<string, unknown> | undefined;

  if (!lighthouseResult || typeof lighthouseResult !== "object") {
    throw new PageSpeedApiError(
      "INVALID_RESPONSE",
      "The PageSpeed Insights response did not include a Lighthouse result payload."
    );
  }

  // Check for fatal Lighthouse runtimeError (e.g. DNS_FAILURE, ERRORED_DOCUMENT_REQUEST)
  const runtimeError = lighthouseResult.runtimeError as
    | { code?: string; message?: string }
    | undefined;
  if (runtimeError?.code && runtimeError.code !== "NO_ERROR") {
    const errMsg =
      runtimeError.message || `Lighthouse returned runtime error (${runtimeError.code}).`;
    if (
      runtimeError.code.includes("DNS") ||
      runtimeError.code.includes("CONNECTION") ||
      runtimeError.code.includes("DOCUMENT_REQUEST")
    ) {
      throw new PageSpeedApiError("SITE_UNREACHABLE", errMsg);
    }
    if (runtimeError.code.includes("BLOCKED") || errMsg.toLowerCase().includes("403")) {
      throw new PageSpeedApiError("BLOCKED_BY_SITE", errMsg);
    }
  }

  const categories = lighthouseResult.categories as
    | Record<string, { score?: number | null } | undefined>
    | undefined;
  const performanceScore = extractCategoryScore(categories, "performance");
  const accessibilityScore = extractCategoryScore(categories, "accessibility");
  const bestPracticesScore = extractCategoryScore(categories, "best-practices");
  const seoScore = extractCategoryScore(categories, "seo");

  const audits = lighthouseResult.audits as Record<string, RawLighthouseAudit> | undefined;
  const metrics = extractLabMetricsFromAudits(audits);
  const opportunities = extractAndPrioritizeOpportunities(audits);

  const runWarnings = Array.isArray(lighthouseResult.runWarnings)
    ? lighthouseResult.runWarnings.filter((w): w is string => typeof w === "string")
    : [];

  const fetchTimeStr =
    typeof lighthouseResult.fetchTime === "string"
      ? lighthouseResult.fetchTime
      : new Date().toISOString();
  const fetchedAt = new Date(fetchTimeStr);

  const requestedUrl =
    typeof lighthouseResult.requestedUrl === "string"
      ? lighthouseResult.requestedUrl
      : fallbackUrl;
  const finalUrl =
    typeof lighthouseResult.finalUrl === "string"
      ? lighthouseResult.finalUrl
      : typeof lighthouseResult.finalDisplayedUrl === "string"
      ? lighthouseResult.finalDisplayedUrl
      : requestedUrl;

  const lighthouseVersion =
    typeof lighthouseResult.lighthouseVersion === "string"
      ? lighthouseResult.lighthouseVersion
      : null;

  const configSettings =
    lighthouseResult.configSettings &&
    typeof lighthouseResult.configSettings === "object"
      ? (lighthouseResult.configSettings as Record<string, unknown>)
      : null;

  const { platform, signals } = detectPlatformFromLighthouse(lighthouseResult);

  return {
    device,
    performanceScore,
    accessibilityScore,
    bestPracticesScore,
    seoScore,
    lighthouseVersion,
    fetchedAt: Number.isNaN(fetchedAt.getTime()) ? new Date() : fetchedAt,
    requestedUrl,
    finalUrl,
    metrics,
    opportunities,
    warnings: runWarnings,
    runtimeError: runtimeError?.code ? runtimeError : null,
    configSettings,
    detectedPlatform: platform,
    platformSignals: signals,
    isDemoMode: false,
  };
}

/**
 * Generates a realistic, deterministic Lighthouse payload ONLY for controlled
 * local development / preview demo mode when external Google PageSpeed API keys
 * are not configured or rate-limited and ALLOW_DEMO_FALLBACK=true.
 */
export function buildControlledDemoPageSpeedPayload(
  targetUrl: string,
  device: "MOBILE" | "DESKTOP"
): Record<string, unknown> {
  const parsed = new URL(targetUrl);
  const host = parsed.hostname.toLowerCase();

  // Handle special test domains to exercise error & edge states deterministically
  if (host.includes("unreachable-site") || host.includes("offline-example")) {
    throw new PageSpeedApiError(
      "SITE_UNREACHABLE",
      `We could not reach ${host}. Please check that the website is online and publicly accessible.`
    );
  }
  if (host.includes("blocked-site") || host.includes("bot-protected")) {
    throw new PageSpeedApiError(
      "BLOCKED_BY_SITE",
      `${host} blocked automated performance testing (HTTP 403 / WAF challenge).`
    );
  }
  if (host.includes("desktop-fails") && device === "DESKTOP") {
    throw new PageSpeedApiError(
      "TIMEOUT",
      `Desktop analysis timed out while testing ${host}.`
    );
  }
  if (host.includes("mobile-fails") && device === "MOBILE") {
    throw new PageSpeedApiError(
      "TIMEOUT",
      `Mobile analysis timed out while testing ${host}.`
    );
  }

  // Deterministic seed from hostname so repeated runs match
  const hash = crypto.createHash("md5").update(host).digest();
  const seed = hash[0] ?? 120;

  let baseMobileScore = 54 + (seed % 34); // default 54 - 87
  if (
    host.includes("fast") ||
    host.includes("stripe.com") ||
    host.includes("vercel.com") ||
    host.includes("linear.app") ||
    host.includes("barkingotter.com")
  ) {
    baseMobileScore = 93 + (seed % 6); // 93 - 98
  } else if (
    host.includes("slow") ||
    host.includes("heavy") ||
    host.includes("legacy") ||
    host.includes("unoptimized")
  ) {
    baseMobileScore = 28 + (seed % 18); // 28 - 45
  }

  const score0to100 =
    device === "MOBILE"
      ? baseMobileScore
      : Math.min(99, baseMobileScore + 14);

  const scoreRatio = Number((score0to100 / 100).toFixed(2));
  const isFast = score0to100 >= 90;
  const isSlow = score0to100 < 50;

  const lcpMs = isFast
    ? device === "MOBILE"
      ? 1650
      : 1100
    : isSlow
    ? device === "MOBILE"
      ? 5400
      : 3600
    : device === "MOBILE"
    ? 3200
    : 2100;

  const fcpMs = Math.round(lcpMs * 0.52);
  const tbtMs = isFast
    ? device === "MOBILE"
      ? 65
      : 20
    : isSlow
    ? device === "MOBILE"
      ? 890
      : 440
    : device === "MOBILE"
    ? 340
    : 150;

  const clsVal = isFast ? 0.02 : isSlow ? 0.28 : 0.08;
  const siMs = Math.round(lcpMs * 1.12);
  const ttfbMs = isFast ? 190 : isSlow ? 1150 : 480;

  // Platform signature simulation for realistic testing of WordPress, Shopify, Next.js, or Unknown
  let assetPrefix = `${targetUrl.replace(/\/$/, "")}/assets`;
  const stackPacks: Array<{ id: string; title: string }> = [];
  if (host.includes("wp") || host.includes("wordpress") || host.includes("bakery") || host.includes("dental")) {
    assetPrefix = `${targetUrl.replace(/\/$/, "")}/wp-content/uploads/2026`;
    stackPacks.push({ id: "wordpress", title: "WordPress" });
  } else if (host.includes("shop") || host.includes("store") || host.includes("apparel")) {
    assetPrefix = "https://cdn.shopify.com/s/files/1/0582";
    stackPacks.push({ id: "shopify", title: "Shopify" });
  } else if (host.includes("next") || host.includes("vercel") || host.includes("saas")) {
    assetPrefix = `${targetUrl.replace(/\/$/, "")}/_next/static/media`;
  }

  const finalUrl = host.startsWith("redirect")
    ? `https://www.${host.replace(/^www\./, "")}/welcome`
    : targetUrl;

  return {
    lighthouseResult: {
      requestedUrl: targetUrl,
      finalUrl,
      fetchTime: new Date().toISOString(),
      lighthouseVersion: "12.4.0",
      runWarnings: host.includes("redirect")
        ? ["The page may not be loading as expected because your test URL redirected to " + finalUrl]
        : [],
      configSettings: {
        formFactor: device === "MOBILE" ? "mobile" : "desktop",
        locale: "en-US",
      },
      stackPacks,
      categories: {
        performance: { score: scoreRatio },
        accessibility: { score: 0.91 },
        "best-practices": { score: 0.95 },
        seo: { score: 0.92 },
      },
      audits: {
        "largest-contentful-paint": {
          id: "largest-contentful-paint",
          title: "Largest Contentful Paint",
          numericValue: lcpMs,
          numericUnit: "millisecond",
          displayValue: `${(lcpMs / 1000).toFixed(1)} s`,
          score: lcpMs <= 2500 ? 0.94 : lcpMs <= 4000 ? 0.65 : 0.22,
        },
        "first-contentful-paint": {
          id: "first-contentful-paint",
          title: "First Contentful Paint",
          numericValue: fcpMs,
          numericUnit: "millisecond",
          displayValue: `${(fcpMs / 1000).toFixed(1)} s`,
          score: fcpMs <= 1800 ? 0.95 : fcpMs <= 3000 ? 0.72 : 0.35,
        },
        "total-blocking-time": {
          id: "total-blocking-time",
          title: "Total Blocking Time",
          numericValue: tbtMs,
          numericUnit: "millisecond",
          displayValue: `${tbtMs} ms`,
          score: tbtMs <= 200 ? 0.96 : tbtMs <= 600 ? 0.62 : 0.18,
        },
        "cumulative-layout-shift": {
          id: "cumulative-layout-shift",
          title: "Cumulative Layout Shift",
          numericValue: clsVal,
          numericUnit: "unitless",
          displayValue: clsVal.toFixed(2),
          score: clsVal <= 0.1 ? 0.98 : clsVal <= 0.25 ? 0.68 : 0.25,
        },
        "speed-index": {
          id: "speed-index",
          title: "Speed Index",
          numericValue: siMs,
          numericUnit: "millisecond",
          displayValue: `${(siMs / 1000).toFixed(1)} s`,
          score: siMs <= 3400 ? 0.92 : siMs <= 5800 ? 0.64 : 0.28,
        },
        "server-response-time": {
          id: "server-response-time",
          title: "Initial server response time was short",
          numericValue: ttfbMs,
          numericUnit: "millisecond",
          displayValue: `Root document took ${ttfbMs} ms`,
          score: ttfbMs <= 600 ? 0.95 : 0.35,
          details:
            ttfbMs > 600
              ? {
                  type: "opportunity",
                  overallSavingsMs: ttfbMs - 350,
                  items: [{ url: finalUrl, responseTime: ttfbMs }],
                }
              : undefined,
        },
        ...(isFast
          ? {
              "uses-long-cache-ttl": {
                id: "uses-long-cache-ttl",
                title: "Serve static assets with an efficient cache policy",
                description:
                  "A long cache lifetime can speed up repeat visits to your page.",
                score: 0.82,
                displayValue: "2 resources found",
                details: {
                  type: "table",
                  overallSavingsBytes: 42 * 1024,
                  items: [
                    {
                      url: `${assetPrefix}/brand-banner.webp`,
                      totalBytes: 68 * 1024,
                      wastedBytes: 34 * 1024,
                    },
                  ],
                },
              },
            }
          : {
              "modern-image-formats": {
                id: "modern-image-formats",
                title: "Serve images in next-gen formats",
                description:
                  "Image formats like WebP and AVIF often provide better compression than PNG or JPEG, which means faster downloads and less data consumption.",
                score: isSlow ? 0.18 : 0.45,
                displayValue: `Potential savings of ${isSlow ? "1,180 KiB" : "490 KiB"}`,
                details: {
                  type: "opportunity",
                  overallSavingsMs: isSlow ? 1150 : 520,
                  overallSavingsBytes: isSlow ? 1180 * 1024 : 490 * 1024,
                  items: [
                    {
                      url: `${assetPrefix}/hero-showcase-banner.jpg`,
                      totalBytes: isSlow ? 980 * 1024 : 420 * 1024,
                      wastedBytes: isSlow ? 740 * 1024 : 310 * 1024,
                    },
                    {
                      url: `${assetPrefix}/feature-overview-grid.png`,
                      totalBytes: isSlow ? 620 * 1024 : 260 * 1024,
                      wastedBytes: isSlow ? 440 * 1024 : 180 * 1024,
                    },
                  ],
                },
              },
              "render-blocking-resources": {
                id: "render-blocking-resources",
                title: "Eliminate render-blocking resources",
                description:
                  "Resources are blocking the first paint of your page. Consider delivering critical JS/CSS inline and deferring all non-critical JS/styles.",
                score: isSlow ? 0.24 : 0.52,
                displayValue: `Potential savings of ${isSlow ? "780 ms" : "390 ms"}`,
                details: {
                  type: "opportunity",
                  overallSavingsMs: isSlow ? 780 : 390,
                  items: [
                    {
                      url: `${targetUrl.replace(/\/$/, "")}/styles/theme-bundle.css`,
                      totalBytes: 118 * 1024,
                      wastedMs: isSlow ? 460 : 240,
                    },
                    {
                      url: `${targetUrl.replace(/\/$/, "")}/scripts/vendor-head.js`,
                      totalBytes: 94 * 1024,
                      wastedMs: isSlow ? 320 : 150,
                    },
                  ],
                },
              },
              "unused-javascript": {
                id: "unused-javascript",
                title: "Reduce unused JavaScript",
                description:
                  "Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity.",
                score: isSlow ? 0.22 : 0.54,
                displayValue: `Potential savings of ${isSlow ? "420 KiB" : "195 KiB"}`,
                details: {
                  type: "opportunity",
                  overallSavingsMs: isSlow ? 680 : 310,
                  overallSavingsBytes: isSlow ? 420 * 1024 : 195 * 1024,
                  items: [
                    {
                      url: `${targetUrl.replace(/\/$/, "")}/scripts/app-client-bundle.js`,
                      totalBytes: 380 * 1024,
                      wastedBytes: 225 * 1024,
                    },
                    {
                      url: "https://www.googletagmanager.com/gtm.js",
                      totalBytes: 142 * 1024,
                      wastedBytes: 78 * 1024,
                    },
                  ],
                },
              },
              "prioritize-lcp-image": {
                id: "prioritize-lcp-image",
                title: "Preload Largest Contentful Paint image",
                description:
                  "Preloading the image used by the Largest Contentful Paint element helps it display faster.",
                score: 0.35,
                displayValue: "Potential savings of 340 ms",
                details: {
                  type: "opportunity",
                  overallSavingsMs: 340,
                  items: [
                    {
                      url: `${assetPrefix}/hero-showcase-banner.jpg`,
                      wastedMs: 340,
                    },
                  ],
                },
              },
              "uses-long-cache-ttl": {
                id: "uses-long-cache-ttl",
                title: "Serve static assets with an efficient cache policy",
                description:
                  "A long cache lifetime can speed up repeat visits to your page.",
                score: 0.48,
                displayValue: "8 resources found",
                details: {
                  type: "table",
                  overallSavingsBytes: 265 * 1024,
                  items: [
                    {
                      url: `${assetPrefix}/hero-showcase-banner.jpg`,
                      totalBytes: 420 * 1024,
                      wastedBytes: 210 * 1024,
                    },
                    {
                      url: `${targetUrl.replace(/\/$/, "")}/fonts/brand-sans.woff2`,
                      totalBytes: 55 * 1024,
                      wastedBytes: 55 * 1024,
                    },
                  ],
                },
              },
              ...(isSlow
                ? {
                    "third-party-summary": {
                      id: "third-party-summary",
                      title: "Reduce the impact of third-party code",
                      description:
                        "Third-party code can significantly impact load performance. Limit the number of redundant third-party providers and try to load third-party code after your page has primarily finished loading.",
                      score: 0.25,
                      displayValue: "Third-party code blocked the main thread for 510 ms",
                      details: {
                        type: "table",
                        overallSavingsMs: 510,
                        items: [
                          {
                            entity: { text: "LiveChat & Customer Widget" },
                            transferSize: 285 * 1024,
                            blockingTime: 340,
                          },
                          {
                            entity: { text: "Tag Manager & Marketing Pixels" },
                            transferSize: 165 * 1024,
                            blockingTime: 170,
                          },
                        ],
                      },
                    },
                    "unsized-images": {
                      id: "unsized-images",
                      title: "Image elements do not have explicit width and height",
                      description:
                        "Set an explicit width and height on image elements to reduce layout shifts and improve CLS.",
                      score: 0.2,
                      displayValue: "3 images missing dimensions",
                      details: {
                        type: "table",
                        items: [
                          {
                            url: `${assetPrefix}/promo-callout.png`,
                          },
                        ],
                      },
                    },
                  }
                : {}),
            }),
      },
    },
  };
}

export async function runPageSpeedTest(
  targetUrl: string,
  device: "MOBILE" | "DESKTOP",
  options?: {
    apiKey?: string;
    timeoutMs?: number;
    allowDemoFallback?: boolean;
  }
): Promise<ParsedPageSpeedRun> {
  const apiKey = options?.apiKey ?? process.env.GOOGLE_PAGESPEED_API_KEY ?? "";
  const timeoutMs = options?.timeoutMs ?? 45000;
  const allowDemoFallback =
    options?.allowDemoFallback ?? process.env.ALLOW_DEMO_FALLBACK === "true";

  // In controlled dev/test mode without an API key, if a special test domain or fast local test is requested
  const hostname = new URL(targetUrl).hostname.toLowerCase();
  const isSyntheticTestDomain =
    hostname.endsWith(".test") ||
    hostname.endsWith(".example") ||
    hostname === "example.com" ||
    hostname.includes("barkingotter") ||
    hostname.includes("unreachable-site") ||
    hostname.includes("blocked-site") ||
    hostname.includes("desktop-fails") ||
    hostname.includes("mobile-fails") ||
    hostname.includes("no-crux-site") ||
    hostname.includes("origin-crux-site") ||
    hostname.includes("slow-bakery") ||
    hostname.includes("fast-saas");

  if (!apiKey && allowDemoFallback && isSyntheticTestDomain) {
    const demoRaw = buildControlledDemoPageSpeedPayload(targetUrl, device);
    const parsed = parsePageSpeedApiResponse(demoRaw, device, targetUrl);
    return { ...parsed, isDemoMode: true };
  }

  const endpoint = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
  );
  endpoint.searchParams.set("url", targetUrl);
  endpoint.searchParams.set("strategy", device === "MOBILE" ? "mobile" : "desktop");
  endpoint.searchParams.append("category", "performance");
  endpoint.searchParams.append("category", "accessibility");
  endpoint.searchParams.append("category", "best-practices");
  endpoint.searchParams.append("category", "seo");
  if (apiKey) {
    endpoint.searchParams.set("key", apiKey);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        // ignore
      }

      if (response.status === 429) {
        if (allowDemoFallback && !apiKey) {
          const demoRaw = buildControlledDemoPageSpeedPayload(targetUrl, device);
          const parsed = parsePageSpeedApiResponse(demoRaw, device, targetUrl);
          return { ...parsed, isDemoMode: true };
        }
        throw new PageSpeedApiError(
          "RATE_LIMITED",
          "Google PageSpeed Insights API quota or rate limit was reached. Please wait a moment and try again.",
          429
        );
      }

      if (response.status === 400 || response.status === 500) {
        const lower = errorBody.toLowerCase();
        if (
          lower.includes("dns") ||
          lower.includes("unreachable") ||
          lower.includes("errored_document_request") ||
          lower.includes("failed_document_request")
        ) {
          throw new PageSpeedApiError(
            "SITE_UNREACHABLE",
            "The target website could not be reached by Google PageSpeed Insights. Verify that the URL is online and publicly accessible.",
            response.status
          );
        }
        if (lower.includes("403") || lower.includes("blocked")) {
          throw new PageSpeedApiError(
            "BLOCKED_BY_SITE",
            "The website's firewall or bot protection blocked automated performance testing.",
            response.status
          );
        }
      }

      throw new PageSpeedApiError(
        "API_ERROR",
        `PageSpeed Insights returned HTTP ${response.status}.`,
        response.status
      );
    }

    const json = (await response.json()) as unknown;
    return parsePageSpeedApiResponse(json, device, targetUrl);
  } catch (error) {
    if (error instanceof PageSpeedApiError) {
      throw error;
    }
    if ((error as Error)?.name === "AbortError") {
      throw new PageSpeedApiError(
        "TIMEOUT",
        `The ${device.toLowerCase()} performance analysis timed out while waiting for the website to respond.`
      );
    }
    if (allowDemoFallback && !apiKey) {
      const demoRaw = buildControlledDemoPageSpeedPayload(targetUrl, device);
      const parsed = parsePageSpeedApiResponse(demoRaw, device, targetUrl);
      return { ...parsed, isDemoMode: true };
    }
    throw new PageSpeedApiError(
      "API_ERROR",
      (error as Error)?.message || "Failed to complete PageSpeed Insights request."
    );
  } finally {
    clearTimeout(timer);
  }
}
