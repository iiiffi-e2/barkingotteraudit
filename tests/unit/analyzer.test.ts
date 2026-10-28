import { describe, it, expect } from "vitest";
import {
  validateAndNormalizeUrl,
  computeAuditDedupeKey,
} from "@/lib/url-validation";
import {
  parsePageSpeedApiResponse,
  extractLabMetricsFromAudits,
} from "@/lib/pagespeed";
import {
  parseCruxRecordResponse,
  buildEmptyCruxSnapshot,
} from "@/lib/crux";
import { extractAndPrioritizeOpportunities } from "@/lib/opportunities";
import {
  validateAIInterpretationWithGuardrails,
  generateDeterministicInterpretation,
} from "@/lib/ai-analysis";
import { sanitizeAnalyticsParams } from "@/lib/analytics";

describe("URL Validation & SSRF Protection", () => {
  it("normalizes bare domains and paths to HTTPS", () => {
    expect(validateAndNormalizeUrl("example.com")).toEqual({
      valid: true,
      normalizedUrl: "https://example.com",
      hostname: "example.com",
      protocol: "https:",
      strippedParams: [],
    });

    expect(validateAndNormalizeUrl("  www.Example.com/pricing#tiers  ")).toEqual({
      valid: true,
      normalizedUrl: "https://www.example.com/pricing",
      hostname: "www.example.com",
      protocol: "https:",
      strippedParams: [],
    });

    expect(validateAndNormalizeUrl("http://example.com/about")).toEqual({
      valid: true,
      normalizedUrl: "https://example.com/about",
      hostname: "example.com",
      protocol: "https:",
      strippedParams: [],
    });
  });

  it("allows explicit HTTP fallback only when allowHttp option is passed", () => {
    const res = validateAndNormalizeUrl("http://legacy-site.org/home", {
      allowHttp: true,
    });
    expect(res.valid).toBe(true);
    expect(res.normalizedUrl).toBe("http://legacy-site.org/home");
    expect(res.protocol).toBe("http:");
  });

  it("strips tracking and sensitive query parameters while keeping legitimate ones", () => {
    const res = validateAndNormalizeUrl(
      "https://shop.example.com/products?category=boots&utm_source=newsletter&fbclid=12345&token=secret99&page=2"
    );
    expect(res.valid).toBe(true);
    expect(res.normalizedUrl).toBe(
      "https://shop.example.com/products?category=boots&page=2"
    );
    expect(res.strippedParams).toEqual(["utm_source", "fbclid", "token"]);
  });

  it("rejects unsafe, private, loopback, metadata, and invalid URLs", () => {
    const unsafeInputs = [
      "",
      "   ",
      "ftp://files.example.com",
      "javascript:alert(1)",
      "file:///etc/passwd",
      "http://localhost:3000",
      "https://localhost/admin",
      "https://app.internal/login",
      "https://127.0.0.1",
      "https://10.0.0.1/status",
      "https://172.16.10.5",
      "https://192.168.1.1",
      "https://169.254.169.254/latest/meta-data/",
      "https://100.100.100.200/latest/meta-data",
      "https://metadata.google.internal",
      "https://[::1]/",
      "https://[fc00::1]/",
      "https://[fe80::1]/",
      "https://admin:password123@example.com",
      "https://example.com:8443/secret",
      "https://intranet",
      `https://example.com/${"a".repeat(2100)}`,
    ];

    for (const input of unsafeInputs) {
      const result = validateAndNormalizeUrl(input);
      expect(result.valid, `Expected "${input}" to be rejected`).toBe(false);
      expect(result.errorCode).toBeDefined();
      expect(result.errorMessage).toBeTruthy();
    }
  });

  it("computes deterministic cache deduplication keys", () => {
    const key1 = computeAuditDedupeKey("https://example.com", 24);
    const key2 = computeAuditDedupeKey("https://EXAMPLE.com", 24);
    const key3 = computeAuditDedupeKey("https://example.com/pricing", 24);

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).toHaveLength(32);
  });
});

describe("Lighthouse Score & Metric Extraction", () => {
  it("extracts exact rounded 0-100 performance score and normalized lab metrics", () => {
    const rawResponse = {
      lighthouseResult: {
        requestedUrl: "https://example.com",
        finalUrl: "https://www.example.com/",
        fetchTime: "2026-10-27T18:00:00.000Z",
        lighthouseVersion: "12.4.0",
        categories: {
          performance: { score: 0.684 },
          accessibility: { score: 0.94 },
        },
        audits: {
          "largest-contentful-paint": {
            numericValue: 2950,
            displayValue: "3.0 s",
            score: 0.64,
          },
          "first-contentful-paint": {
            numericValue: 1450,
            displayValue: "1.5 s",
            score: 0.93,
          },
          "total-blocking-time": {
            numericValue: 720,
            displayValue: "720 ms",
            score: 0.15,
          },
          "cumulative-layout-shift": {
            numericValue: 0.04,
            displayValue: "0.04",
            score: 0.99,
          },
          "speed-index": {
            numericValue: 3300,
            displayValue: "3.3 s",
            score: 0.89,
          },
        },
      },
    };

    const parsed = parsePageSpeedApiResponse(
      rawResponse,
      "MOBILE",
      "https://example.com"
    );

    expect(parsed.performanceScore).toBe(68);
    expect(parsed.accessibilityScore).toBe(94);
    expect(parsed.finalUrl).toBe("https://www.example.com/");
    expect(parsed.metrics.lcp.status).toBe("needs-improvement");
    expect(parsed.metrics.fcp.status).toBe("good");
    expect(parsed.metrics.tbt.status).toBe("poor");
    expect(parsed.metrics.cls.status).toBe("good");
    expect(parsed.metrics.speedIndex.status).toBe("good");
  });

  it("handles missing metrics and null scores transparently without fabricating data", () => {
    const metrics = extractLabMetricsFromAudits({});
    expect(metrics.lcp.numericValue).toBeNull();
    expect(metrics.lcp.status).toBe("unknown");
    expect(metrics.lcp.displayValue).toBe("Unavailable");

    const parsed = parsePageSpeedApiResponse(
      {
        lighthouseResult: {
          categories: { performance: { score: null } },
          audits: {},
        },
      },
      "DESKTOP",
      "https://example.com"
    );
    expect(parsed.performanceScore).toBeNull();
  });
});

describe("Core Web Vitals (CrUX) Threshold Classification & Provenance", () => {
  it("classifies passing 75th-percentile field metrics and preserves PAGE scope", () => {
    const crux = parseCruxRecordResponse(
      {
        record: {
          key: { url: "https://example.com", formFactor: "PHONE" },
          collectionPeriod: {
            firstDate: { year: 2026, month: 9, day: 28 },
            lastDate: { year: 2026, month: 10, day: 25 },
          },
          metrics: {
            largest_contentful_paint: { percentiles: { p75: 2100 } },
            interaction_to_next_paint: { percentiles: { p75: 140 } },
            cumulative_layout_shift: { percentiles: { p75: "0.06" } },
          },
        },
      },
      "MOBILE",
      "PAGE",
      "https://example.com"
    );

    expect(crux.dataScope).toBe("PAGE");
    expect(crux.overallStatus).toBe("PASSED");
    expect(crux.metrics.lcp.status).toBe("good");
    expect(crux.metrics.inp.status).toBe("good");
    expect(crux.metrics.cls.status).toBe("good");
  });

  it("marks overallStatus FAILED when any Core Web Vital exceeds good threshold", () => {
    const crux = parseCruxRecordResponse(
      {
        record: {
          metrics: {
            largest_contentful_paint: { percentiles: { p75: 4200 } },
            interaction_to_next_paint: { percentiles: { p75: 180 } },
            cumulative_layout_shift: { percentiles: { p75: "0.05" } },
          },
        },
      },
      "MOBILE",
      "ORIGIN",
      "https://example.com"
    );

    expect(crux.dataScope).toBe("ORIGIN");
    expect(crux.overallStatus).toBe("FAILED");
    expect(crux.metrics.lcp.status).toBe("poor");
  });

  it("returns UNAVAILABLE when CrUX data is missing", () => {
    const empty = buildEmptyCruxSnapshot("https://new-site.example", "MOBILE");
    expect(empty.dataScope).toBe("UNAVAILABLE");
    expect(empty.overallStatus).toBe("UNAVAILABLE");
    expect(empty.metrics.lcp.status).toBe("unknown");
  });
});

describe("Opportunity Prioritization & Provenance", () => {
  it("prioritizes high-impact audits ahead of minor diagnostics and preserves audit IDs", () => {
    const opportunities = extractAndPrioritizeOpportunities({
      "uses-long-cache-ttl": {
        id: "uses-long-cache-ttl",
        title: "Serve static assets with an efficient cache policy",
        score: 0.72,
        details: {
          overallSavingsBytes: 24 * 1024,
          items: [{ url: "https://example.com/logo.png", totalBytes: 24576 }],
        },
      },
      "render-blocking-resources": {
        id: "render-blocking-resources",
        title: "Eliminate render-blocking resources",
        score: 0.15,
        details: {
          overallSavingsMs: 920,
          items: [{ url: "https://example.com/main.css", wastedMs: 920 }],
        },
      },
    });

    expect(opportunities).toHaveLength(2);
    expect(opportunities[0].sourceAuditIds).toContain(
      "render-blocking-resources"
    );
    expect(opportunities[0].priority).toBe("HIGH");
    expect(opportunities[0].complexity).toBe("INVESTIGATION");
    expect(opportunities[1].sourceAuditIds).toContain("uses-long-cache-ttl");
    expect(opportunities[1].priority).toBe("MEDIUM");
    expect(opportunities[1].complexity).toBe("STRAIGHTFORWARD");
  });
});

describe("AI Schema Validation & Guardrails", () => {
  it("validates deterministic interpretation against schema and guardrails", () => {
    const metrics = extractLabMetricsFromAudits({
      "largest-contentful-paint": { numericValue: 3400, displayValue: "3.4 s" },
    });
    const output = generateDeterministicInterpretation({
      hostname: "example.com",
      testedUrl: "https://example.com",
      mobileScore: 62,
      desktopScore: 84,
      mobileMetrics: metrics,
      desktopMetrics: metrics,
      mobileCrux: null,
      desktopCrux: null,
      topOpportunities: [],
      detectedPlatform: "WordPress",
      warnings: [],
      lighthouseVersion: "12.4.0",
    });

    const validation = validateAIInterpretationWithGuardrails(output);
    expect(validation.valid).toBe(true);
  });

  it("rejects AI outputs containing prohibited guarantees or revenue claims", () => {
    const badCandidate = {
      headline: "We promise a guaranteed 100 score on PageSpeed!",
      summary:
        "Your website is costing you thousands every day. Hire us to boost your conversions by 300% immediately with a guaranteed 100 score.",
      overallAssessment: "We already inspected your source code.",
      opportunities: [],
      closingMessage: "Call now for a guaranteed 100 score.",
    };

    const validation = validateAIInterpretationWithGuardrails(badCandidate);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("violated guardrail");
  });
});

describe("Analytics Privacy & PII Sanitization", () => {
  it("strips email addresses, names, tokens, and full URLs from analytics events", () => {
    const sanitized = sanitizeAnalyticsParams({
      device_category: "mobile",
      score_band: "needs-improvement",
      email: "owner@secretbusiness.com",
      name: "Jane Owner",
      raw_url: "https://secretbusiness.com/private?token=123",
      custom_note: "contact me at jane@secretbusiness.com",
    });

    expect(sanitized).toEqual({
      device_category: "mobile",
      score_band: "needs-improvement",
    });
  });
});
