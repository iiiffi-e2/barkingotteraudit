export type AnalyticsEventName =
  | "audit_started"
  | "audit_completed"
  | "audit_failed"
  | "audit_cached"
  | "report_viewed"
  | "device_tab_changed"
  | "opportunity_expanded"
  | "report_downloaded"
  | "report_shared"
  | "optimization_cta_clicked"
  | "lead_form_started"
  | "lead_submitted"
  | "email_report_requested";

export interface AnalyticsEventDimensions {
  device_category?: "mobile" | "desktop";
  score_band?: "good" | "needs-improvement" | "poor" | "unknown";
  audit_status?: string;
  conversion_source?: string;
  opportunity_category?: string;
  opportunity_priority?: string;
  audit_id?: string;
  hostname?: string;
}

const firedOnceRegistry = new Set<string>();

const FORBIDDEN_PII_KEYS = new Set([
  "email",
  "name",
  "full_name",
  "phone",
  "token",
  "api_key",
  "secret",
  "password",
  "full_url",
  "raw_url",
]);

export function sanitizeAnalyticsParams(
  params?: Record<string, unknown>
): Record<string, string | number | boolean> {
  if (!params) return {};
  const clean: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(params)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_PII_KEYS.has(lowerKey)) continue;
    if (value === null || value === undefined) continue;

    if (typeof value === "string") {
      // Never send strings that look like email addresses
      if (value.includes("@")) continue;
      clean[key] = value.slice(0, 100);
    } else if (typeof value === "number" || typeof value === "boolean") {
      clean[key] = value;
    }
  }

  return clean;
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  dimensions?: AnalyticsEventDimensions,
  options?: { deduplicateKey?: string }
): void {
  if (options?.deduplicateKey) {
    const key = `${eventName}:${options.deduplicateKey}`;
    if (firedOnceRegistry.has(key)) {
      return;
    }
    firedOnceRegistry.add(key);
  }

  const safeParams = sanitizeAnalyticsParams(
    dimensions as Record<string, unknown> | undefined
  );

  if (typeof window !== "undefined") {
    const win = window as unknown as {
      gtag?: (
        command: string,
        event: string,
        params: Record<string, string | number | boolean>
      ) => void;
      dataLayer?: Array<Record<string, unknown>>;
    };

    if (typeof win.gtag === "function") {
      win.gtag("event", eventName, safeParams);
    } else if (Array.isArray(win.dataLayer)) {
      win.dataLayer.push({
        event: eventName,
        ...safeParams,
      });
    }
  }
}
