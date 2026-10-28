import {
  MetricStatus,
  NormalizedCruxMetric,
  NormalizedCruxSnapshot,
} from "@/types/audit";

interface RawCruxMetricRecord {
  histogram?: Array<{
    start?: number | string;
    end?: number | string;
    density?: number;
  }>;
  percentiles?: {
    p75?: number | string;
  };
}

interface RawCruxResponse {
  record?: {
    key?: {
      url?: string;
      origin?: string;
      formFactor?: string;
    };
    metrics?: Record<string, RawCruxMetricRecord>;
    collectionPeriod?: {
      firstDate?: { year: number; month: number; day: number };
      lastDate?: { year: number; month: number; day: number };
    };
  };
}

function classifyCruxValue(
  p75: number | null,
  goodMax: number,
  poorMin: number
): MetricStatus {
  if (p75 === null || !Number.isFinite(p75)) return "unknown";
  if (p75 <= goodMax) return "good";
  if (p75 <= poorMin) return "needs-improvement";
  return "poor";
}

function parseDistribution(
  histogram: RawCruxMetricRecord["histogram"]
): { good: number; needsImprovement: number; poor: number } | undefined {
  if (!Array.isArray(histogram) || histogram.length === 0) return undefined;
  const g = Math.round((Number(histogram[0]?.density) || 0) * 100);
  const ni = Math.round((Number(histogram[1]?.density) || 0) * 100);
  const p = Math.max(0, 100 - g - ni);
  return { good: g, needsImprovement: ni, poor: p };
}

function parseCruxMetric(
  raw: RawCruxMetricRecord | undefined,
  id: NormalizedCruxMetric["id"],
  acronym: string,
  label: string,
  unit: "s" | "ms" | "unitless",
  goodMax: number,
  poorMin: number,
  goodThresholdLabel: string
): NormalizedCruxMetric {
  const rawP75 = raw?.percentiles?.p75;
  const numericP75 =
    rawP75 !== undefined && rawP75 !== null && !Number.isNaN(Number(rawP75))
      ? Number(rawP75)
      : null;

  let displayValue = "Unavailable";
  if (numericP75 !== null) {
    if (unit === "s") {
      displayValue = `${(numericP75 / 1000).toFixed(2)} s`;
    } else if (unit === "ms") {
      displayValue = `${Math.round(numericP75)} ms`;
    } else {
      displayValue = numericP75.toFixed(2);
    }
  }

  return {
    id,
    acronym,
    label,
    p75: numericP75,
    displayValue,
    unit,
    status: classifyCruxValue(numericP75, goodMax, poorMin),
    goodThresholdLabel,
    distribution: parseDistribution(raw?.histogram),
  };
}

function formatCruxDate(d?: { year: number; month: number; day: number }): string {
  if (!d || !d.year || !d.month || !d.day) return "";
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export function buildEmptyCruxSnapshot(
  targetUrl: string,
  device: "MOBILE" | "DESKTOP"
): NormalizedCruxSnapshot {
  return {
    device,
    dataScope: "UNAVAILABLE",
    sourceIdentifier: targetUrl,
    overallStatus: "UNAVAILABLE",
    collectionPeriod: null,
    metrics: {
      lcp: parseCruxMetric(
        undefined,
        "lcp",
        "LCP",
        "Largest Contentful Paint",
        "s",
        2500,
        4000,
        "≤ 2.5 s"
      ),
      inp: parseCruxMetric(
        undefined,
        "inp",
        "INP",
        "Interaction to Next Paint",
        "ms",
        200,
        500,
        "≤ 200 ms"
      ),
      cls: parseCruxMetric(
        undefined,
        "cls",
        "CLS",
        "Cumulative Layout Shift",
        "unitless",
        0.1,
        0.25,
        "≤ 0.10"
      ),
    },
  };
}

export function parseCruxRecordResponse(
  rawData: RawCruxResponse,
  device: "MOBILE" | "DESKTOP",
  dataScope: "PAGE" | "ORIGIN",
  sourceIdentifier: string
): NormalizedCruxSnapshot {
  const metricsObj = rawData?.record?.metrics;
  if (!metricsObj || Object.keys(metricsObj).length === 0) {
    return buildEmptyCruxSnapshot(sourceIdentifier, device);
  }

  const lcp = parseCruxMetric(
    metricsObj.largest_contentful_paint,
    "lcp",
    "LCP",
    "Largest Contentful Paint",
    "s",
    2500,
    4000,
    "≤ 2.5 s"
  );

  const inp = parseCruxMetric(
    metricsObj.interaction_to_next_paint,
    "inp",
    "INP",
    "Interaction to Next Paint",
    "ms",
    200,
    500,
    "≤ 200 ms"
  );

  const cls = parseCruxMetric(
    metricsObj.cumulative_layout_shift,
    "cls",
    "CLS",
    "Cumulative Layout Shift",
    "unitless",
    0.1,
    0.25,
    "≤ 0.10"
  );

  const fcp = metricsObj.first_contentful_paint
    ? parseCruxMetric(
        metricsObj.first_contentful_paint,
        "fcp",
        "FCP",
        "First Contentful Paint",
        "s",
        1800,
        3000,
        "≤ 1.8 s"
      )
    : undefined;

  const ttfb = metricsObj.experimental_time_to_first_byte
    ? parseCruxMetric(
        metricsObj.experimental_time_to_first_byte,
        "ttfb",
        "TTFB",
        "Time to First Byte",
        "ms",
        800,
        1800,
        "≤ 800 ms"
      )
    : undefined;

  // Determine Core Web Vitals pass/fail according to official Google methodology:
  // Requires LCP and CLS (and INP if available) to be in the "good" threshold at p75.
  let overallStatus: "PASSED" | "FAILED" | "UNAVAILABLE" = "UNAVAILABLE";
  if (lcp.status !== "unknown" && cls.status !== "unknown") {
    const requiredMetrics =
      inp.status !== "unknown" ? [lcp, inp, cls] : [lcp, cls];
    const allGood = requiredMetrics.every((m) => m.status === "good");
    overallStatus = allGood ? "PASSED" : "FAILED";
  }

  const period = rawData.record?.collectionPeriod;
  const collectionPeriod =
    period?.firstDate && period?.lastDate
      ? {
          firstDate: formatCruxDate(period.firstDate),
          lastDate: formatCruxDate(period.lastDate),
        }
      : null;

  return {
    device,
    dataScope,
    sourceIdentifier,
    overallStatus,
    collectionPeriod,
    metrics: {
      lcp,
      inp,
      cls,
      fcp,
      ttfb,
    },
  };
}

async function queryCruxApiOnce(
  body: Record<string, string>,
  apiKey: string,
  timeoutMs = 12000
): Promise<RawCruxResponse | null> {
  const endpoint = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(
    apiKey
  )}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as RawCruxResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function buildControlledDemoCruxSnapshot(
  targetUrl: string,
  device: "MOBILE" | "DESKTOP",
  enableOriginFallback = true
): NormalizedCruxSnapshot {
  const parsed = new URL(targetUrl);
  const host = parsed.hostname.toLowerCase();

  // Sites without enough real-user traffic return UNAVAILABLE
  if (
    host.includes("no-crux") ||
    host.includes("local-bakery") ||
    host.includes("new-launch") ||
    host.includes("smallbiz")
  ) {
    return buildEmptyCruxSnapshot(targetUrl, device);
  }

  const isSubpage = parsed.pathname && parsed.pathname !== "/";
  const useOriginScope =
    host.includes("origin-crux") || (isSubpage && enableOriginFallback);

  if (isSubpage && !enableOriginFallback && !host.includes("page-crux")) {
    return buildEmptyCruxSnapshot(targetUrl, device);
  }

  const isFast =
    host.includes("fast") ||
    host.includes("stripe.com") ||
    host.includes("vercel.com") ||
    host.includes("barkingotter.com");
  const isSlow =
    host.includes("slow") ||
    host.includes("heavy") ||
    host.includes("legacy");

  const lcpP75 = isFast
    ? device === "MOBILE"
      ? 1850
      : 1250
    : isSlow
    ? device === "MOBILE"
      ? 4350
      : 3100
    : device === "MOBILE"
    ? 2750
    : 2150;

  const inpP75 = isFast
    ? device === "MOBILE"
      ? 115
      : 65
    : isSlow
    ? device === "MOBILE"
      ? 340
      : 220
    : device === "MOBILE"
    ? 185
    : 110;

  const clsP75 = isFast ? "0.03" : isSlow ? "0.24" : "0.08";

  const mockRaw: RawCruxResponse = {
    record: {
      key: {
        ...(useOriginScope ? { origin: parsed.origin } : { url: targetUrl }),
        formFactor: device === "MOBILE" ? "PHONE" : "DESKTOP",
      },
      collectionPeriod: {
        firstDate: { year: 2026, month: 9, day: 29 },
        lastDate: { year: 2026, month: 10, day: 26 },
      },
      metrics: {
        largest_contentful_paint: {
          percentiles: { p75: lcpP75 },
          histogram: isFast
            ? [{ density: 0.86 }, { density: 0.1 }, { density: 0.04 }]
            : isSlow
            ? [{ density: 0.34 }, { density: 0.31 }, { density: 0.35 }]
            : [{ density: 0.68 }, { density: 0.21 }, { density: 0.11 }],
        },
        interaction_to_next_paint: {
          percentiles: { p75: inpP75 },
          histogram: isFast
            ? [{ density: 0.91 }, { density: 0.06 }, { density: 0.03 }]
            : isSlow
            ? [{ density: 0.48 }, { density: 0.32 }, { density: 0.2 }]
            : [{ density: 0.78 }, { density: 0.15 }, { density: 0.07 }],
        },
        cumulative_layout_shift: {
          percentiles: { p75: clsP75 },
          histogram: isFast
            ? [{ density: 0.94 }, { density: 0.04 }, { density: 0.02 }]
            : isSlow
            ? [{ density: 0.52 }, { density: 0.22 }, { density: 0.26 }]
            : [{ density: 0.83 }, { density: 0.11 }, { density: 0.06 }],
        },
      },
    },
  };

  return parseCruxRecordResponse(
    mockRaw,
    device,
    useOriginScope ? "ORIGIN" : "PAGE",
    useOriginScope ? parsed.origin : targetUrl
  );
}

export async function fetchCruxSnapshot(
  targetUrl: string,
  device: "MOBILE" | "DESKTOP",
  options?: {
    apiKey?: string;
    enableOriginFallback?: boolean;
    allowDemoFallback?: boolean;
  }
): Promise<NormalizedCruxSnapshot> {
  const apiKey =
    options?.apiKey ??
    process.env.GOOGLE_CRUX_API_KEY ??
    process.env.GOOGLE_PAGESPEED_API_KEY ??
    "";
  const enableOriginFallback = options?.enableOriginFallback ?? true;
  const allowDemoFallback =
    options?.allowDemoFallback ?? process.env.ALLOW_DEMO_FALLBACK === "true";

  if (!apiKey) {
    if (allowDemoFallback) {
      return buildControlledDemoCruxSnapshot(
        targetUrl,
        device,
        enableOriginFallback
      );
    }
    return buildEmptyCruxSnapshot(targetUrl, device);
  }

  const formFactor = device === "MOBILE" ? "PHONE" : "DESKTOP";

  // 1. Attempt page-level CrUX data first
  const pageResponse = await queryCruxApiOnce(
    { url: targetUrl, formFactor },
    apiKey
  );
  if (pageResponse?.record?.metrics) {
    return parseCruxRecordResponse(pageResponse, device, "PAGE", targetUrl);
  }

  // 2. Fall back to origin-level data if enabled and page-level data is unavailable
  if (enableOriginFallback) {
    const origin = new URL(targetUrl).origin;
    const originResponse = await queryCruxApiOnce(
      { origin, formFactor },
      apiKey
    );
    if (originResponse?.record?.metrics) {
      return parseCruxRecordResponse(
        originResponse,
        device,
        "ORIGIN",
        origin
      );
    }
  }

  return buildEmptyCruxSnapshot(targetUrl, device);
}
