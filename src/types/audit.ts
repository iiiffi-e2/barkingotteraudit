export type MetricStatus = "good" | "needs-improvement" | "poor" | "unknown";

export interface NormalizedLabMetric {
  id:
    | "largest-contentful-paint"
    | "first-contentful-paint"
    | "total-blocking-time"
    | "cumulative-layout-shift"
    | "speed-index"
    | "server-response-time"
    | "interactive";
  acronym: string;
  label: string;
  plainDescription: string;
  detailedExplanation: string;
  numericValue: number | null;
  unit: "ms" | "s" | "unitless";
  displayValue: string;
  score: number | null;
  status: MetricStatus;
  thresholds: {
    good: string;
    poor: string;
  };
}

export interface NormalizedLabMetricsMap {
  lcp: NormalizedLabMetric;
  fcp: NormalizedLabMetric;
  tbt: NormalizedLabMetric;
  cls: NormalizedLabMetric;
  speedIndex: NormalizedLabMetric;
  ttfb?: NormalizedLabMetric;
  interactive?: NormalizedLabMetric;
}

export interface CruxMetricDistribution {
  good: number;
  needsImprovement: number;
  poor: number;
}

export interface NormalizedCruxMetric {
  id: "lcp" | "inp" | "cls" | "fcp" | "ttfb";
  acronym: string;
  label: string;
  p75: number | null;
  displayValue: string;
  unit: "s" | "ms" | "unitless";
  status: MetricStatus;
  goodThresholdLabel: string;
  distribution?: CruxMetricDistribution;
}

export interface NormalizedCruxSnapshot {
  device: "MOBILE" | "DESKTOP";
  dataScope: "PAGE" | "ORIGIN" | "UNAVAILABLE";
  sourceIdentifier: string;
  overallStatus: "PASSED" | "FAILED" | "UNAVAILABLE";
  collectionPeriod?: {
    firstDate: string;
    lastDate: string;
  } | null;
  metrics: {
    lcp: NormalizedCruxMetric;
    inp: NormalizedCruxMetric;
    cls: NormalizedCruxMetric;
    fcp?: NormalizedCruxMetric;
    ttfb?: NormalizedCruxMetric;
  };
}

export type OpportunityCategory =
  | "Image sizing and compression"
  | "Modern image formats"
  | "Lazy loading"
  | "JavaScript execution"
  | "Unused JavaScript"
  | "Render-blocking resources"
  | "CSS optimization"
  | "Font loading"
  | "Browser caching"
  | "Server response performance"
  | "Redirect chains"
  | "Third-party scripts"
  | "Main-thread workload"
  | "Layout instability"
  | "Resource prioritization"
  | "Network payload size"
  | "Long dependency chains"
  | "Other Lighthouse diagnostics";

export interface AffectedResourceItem {
  url?: string;
  label?: string;
  totalBytes?: number;
  wastedBytes?: number;
  wastedMs?: number;
  TransferSizeDisplay?: string;
  savingsDisplay?: string;
}

export interface NormalizedOpportunity {
  id?: string;
  sourceAuditIds: string[];
  title: string;
  originalTitle: string;
  category: OpportunityCategory;
  priority: "HIGH" | "MEDIUM" | "LOW";
  complexity: "STRAIGHTFORWARD" | "INVESTIGATION" | "COMPLEX";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
  whyItMatters: string;
  recommendation: string;
  technicalRecommendation: string;
  documentationUrl: string | null;
  evidence: {
    items: AffectedResourceItem[];
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
    auditScore?: number | null;
    displayValue?: string;
  };
  estimatedSavings: {
    wastedMs?: number;
    wastedBytes?: number;
    displayValue?: string;
  };
  impactScore: number;
}

export interface AIReportInterpretation {
  headline: string;
  summary: string;
  overallAssessment: string;
  opportunities: Array<{
    auditIds: string[];
    title: string;
    plainEnglishExplanation: string;
    whyItMatters: string;
    potentialFix: string;
    priority: "high" | "medium" | "low";
    complexity: "straightforward" | "moderate" | "complex";
    confidence: "high" | "medium" | "low";
  }>;
  closingMessage: string;
}

export interface PublicAuditReport {
  id: string;
  requestedUrl: string;
  normalizedUrl: string;
  finalUrl: string | null;
  hostname: string;
  status:
    | "QUEUED"
    | "ANALYZING_MOBILE"
    | "ANALYZING_DESKTOP"
    | "REVIEWING_METRICS"
    | "IDENTIFYING_OPPORTUNITIES"
    | "PREPARING_REPORT"
    | "COMPLETED"
    | "PARTIAL"
    | "FAILED"
    | "EXPIRED";
  source: string;
  cachedFromAuditId: string | null;
  detectedPlatform: string | null;
  platformSignals: string[];
  isDemoMode: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  previousAuditComparison?: {
    previousAuditId: string;
    previousDate: string;
    mobileScoreDelta: number | null;
    desktopScoreDelta: number | null;
    previousMobileScore: number | null;
    previousDesktopScore: number | null;
  } | null;
  runs: {
    MOBILE: {
      status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
      performanceScore: number | null;
      accessibilityScore: number | null;
      bestPracticesScore: number | null;
      seoScore: number | null;
      lighthouseVersion: string | null;
      fetchedAt: string | null;
      finalUrl: string | null;
      metrics: NormalizedLabMetricsMap | null;
      warnings: string[];
      errorMessage: string | null;
      opportunities: NormalizedOpportunity[];
    } | null;
    DESKTOP: {
      status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
      performanceScore: number | null;
      accessibilityScore: number | null;
      bestPracticesScore: number | null;
      seoScore: number | null;
      lighthouseVersion: string | null;
      fetchedAt: string | null;
      finalUrl: string | null;
      metrics: NormalizedLabMetricsMap | null;
      warnings: string[];
      errorMessage: string | null;
      opportunities: NormalizedOpportunity[];
    } | null;
  };
  crux: {
    MOBILE: NormalizedCruxSnapshot | null;
    DESKTOP: NormalizedCruxSnapshot | null;
  };
  aiAnalysis: {
    model: string;
    isFallback: boolean;
    output: AIReportInterpretation;
  } | null;
  events: Array<{
    eventType: string;
    createdAt: string;
    message?: string;
  }>;
}
