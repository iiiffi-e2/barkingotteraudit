"use client";

import React, { useEffect, useState } from "react";
import { PublicAuditReport } from "@/types/audit";
import { AuditProgress } from "@/components/AuditProgress";
import { AuditErrorState } from "@/components/AuditErrorState";
import { DeviceSwitcher } from "@/components/DeviceSwitcher";
import { PerformanceGauge } from "@/components/PerformanceGauge";
import { MetricCard } from "@/components/MetricCard";
import { CoreWebVitalsPanel } from "@/components/CoreWebVitalsPanel";
import { ResultsSummary } from "@/components/ResultsSummary";
import { OpportunityCard } from "@/components/OpportunityCard";
import { OptimizationAssessment } from "@/components/OptimizationAssessment";
import { ConversionCTA } from "@/components/ConversionCTA";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { ReportActions } from "@/components/ReportActions";
import {
  Globe,
  Calendar,
  ArrowRight,
  AlertTriangle,
  Info,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getScoreBand } from "@/lib/utils";

interface AuditReportViewProps {
  initialReport: PublicAuditReport;
}

const TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "PARTIAL",
  "FAILED",
  "EXPIRED",
]);

export function AuditReportView({ initialReport }: AuditReportViewProps) {
  const [report, setReport] = useState<PublicAuditReport>(initialReport);
  const [selectedDevice, setSelectedDevice] = useState<"MOBILE" | "DESKTOP">(
    "MOBILE"
  );
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);
  const [leadCtaSource, setLeadCtaSource] = useState<string>("OPTIMIZATION_PLAN");

  const isTerminal = TERMINAL_STATUSES.has(report.status);

  // Poll status while scan is running
  useEffect(() => {
    if (isTerminal) return;

    const timer = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/audits/${report.id}/status`, {
          cache: "no-store",
        });
        if (!statusRes.ok) return;
        const statusData = await statusRes.json();

        if (statusData.isTerminal) {
          const fullRes = await fetch(`/api/audits/${report.id}`, {
            cache: "no-store",
          });
          if (fullRes.ok) {
            const fullData = await fullRes.json();
            if (fullData.report) {
              setReport(fullData.report);
            }
          }
        } else {
          setReport((prev) => ({
            ...prev,
            status: statusData.status,
            events: statusData.events || prev.events,
          }));
        }
      } catch {
        // Continue polling on transient network glitch
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [isTerminal, report.id]);

  // Fire analytics events once when report completes or is viewed
  useEffect(() => {
    if (report.status === "COMPLETED" || report.status === "PARTIAL") {
      const mobileScore = report.runs.MOBILE?.performanceScore ?? null;
      trackAnalyticsEvent(
        "report_viewed",
        {
          audit_id: report.id,
          hostname: report.hostname,
          audit_status: report.status,
          score_band: getScoreBand(mobileScore),
        },
        { deduplicateKey: report.id }
      );
      trackAnalyticsEvent(
        "audit_completed",
        {
          audit_id: report.id,
          hostname: report.hostname,
          audit_status: report.status,
          score_band: getScoreBand(mobileScore),
        },
        { deduplicateKey: report.id }
      );
    } else if (report.status === "FAILED") {
      trackAnalyticsEvent(
        "audit_failed",
        {
          audit_id: report.id,
          hostname: report.hostname,
          audit_status: "FAILED",
        },
        { deduplicateKey: report.id }
      );
    }
  }, [report.id, report.hostname, report.status, report.runs.MOBILE?.performanceScore]);

  // Screen 2: Analysis in Progress
  if (!isTerminal) {
    return (
      <AuditProgress
        auditId={report.id}
        hostname={report.hostname}
        normalizedUrl={report.normalizedUrl}
        currentStatus={report.status}
        startedAt={report.startedAt}
      />
    );
  }

  // Error or Expired State
  if (report.status === "FAILED" || report.status === "EXPIRED") {
    return (
      <AuditErrorState
        auditId={report.id}
        normalizedUrl={report.normalizedUrl}
        hostname={report.hostname}
        errorCode={report.errorCode}
        errorMessage={report.errorMessage}
        isExpired={report.status === "EXPIRED"}
      />
    );
  }

  const currentRun =
    report.runs[selectedDevice] ||
    (selectedDevice === "MOBILE" ? report.runs.DESKTOP : report.runs.MOBILE);

  const currentCrux = report.crux[selectedDevice];
  const mobileScore = report.runs.MOBILE?.performanceScore ?? null;
  const desktopScore = report.runs.DESKTOP?.performanceScore ?? null;
  const activeScore =
    selectedDevice === "MOBILE" ? mobileScore : desktopScore;

  const opportunities = currentRun?.opportunities ?? [];
  const visibleOpportunities = showAllOpportunities
    ? opportunities
    : opportunities.slice(0, 5);

  const formattedDate = new Date(
    report.completedAt || report.createdAt
  ).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  function scrollToLeadForm(source: "OPTIMIZATION_PLAN" | "CONSULTATION") {
    setLeadCtaSource(source);
    const el = document.getElementById("optimization-plan-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div id="report-top" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-8 pb-24 sm:pb-16">
      {/* Controlled Local / Preview Demo Notice */}
      {report.isDemoMode && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <span>
            <strong>Controlled Preview / Development Environment:</strong>{" "}
            External Google API credentials were not provided in this local
            environment, so this report uses deterministic Lighthouse &amp; CrUX
            test fixtures. Configure{" "}
            <code className="font-mono">GOOGLE_PAGESPEED_API_KEY</code> and{" "}
            <code className="font-mono">GOOGLE_CRUX_API_KEY</code> in production.
          </span>
        </div>
      )}

      {/* Partial Result Notice if one device succeeded while the other failed */}
      {report.status === "PARTIAL" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">
              Partial Analysis Completed — One Device Scan Encountered an Issue
            </p>
            <p className="mt-0.5 text-xs sm:text-sm text-amber-900">
              {report.errorMessage ||
                "We retained the successful device results below. You can use the Rerun Test button to retry the incomplete device check."}
            </p>
          </div>
        </div>
      )}

      {/* Section A: Results Header */}
      <header className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
              <span>Your Website Performance Report</span>
            </span>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-amber-400 font-bold text-base uppercase">
                {report.hostname.slice(0, 1)}
              </div>
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-950 break-all">
                {report.normalizedUrl}
              </h1>
            </div>

            {report.finalUrl && report.finalUrl !== report.normalizedUrl && (
              <p className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-700">
                <span>Redirected to final URL:</span>
                <strong className="font-semibold text-slate-900">
                  {report.finalUrl}
                </strong>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span>Analyzed {formattedDate}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span>
                  Scope: Single-page assessment of the submitted URL (not a
                  full-site crawl)
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-3">
            <DeviceSwitcher
              selectedDevice={selectedDevice}
              onChange={setSelectedDevice}
              mobileScore={mobileScore}
              desktopScore={desktopScore}
              auditId={report.id}
            />
          </div>
        </div>

        {/* Historical Comparison Banner when previous baseline exists */}
        {report.previousAuditComparison && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <span>
                <strong>Historical Baseline Comparison:</strong> Compared to the
                previous scan on{" "}
                {new Date(
                  report.previousAuditComparison.previousDate
                ).toLocaleDateString("en-US", { dateStyle: "medium" })}
                :
              </span>
            </div>
            <div className="flex items-center gap-4 font-medium">
              {report.previousAuditComparison.previousMobileScore !== null && (
                <span>
                  Previous Mobile:{" "}
                  {report.previousAuditComparison.previousMobileScore} (
                  {report.previousAuditComparison.mobileScoreDelta !== null &&
                  report.previousAuditComparison.mobileScoreDelta >= 0
                    ? `+${report.previousAuditComparison.mobileScoreDelta}`
                    : report.previousAuditComparison.mobileScoreDelta}
                  )
                </span>
              )}
              {report.previousAuditComparison.previousDesktopScore !== null && (
                <span>
                  Previous Desktop:{" "}
                  {report.previousAuditComparison.previousDesktopScore} (
                  {report.previousAuditComparison.desktopScoreDelta !== null &&
                  report.previousAuditComparison.desktopScoreDelta >= 0
                    ? `+${report.previousAuditComparison.desktopScoreDelta}`
                    : report.previousAuditComparison.desktopScoreDelta}
                  )
                </span>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <ReportActions auditId={report.id} hostname={report.hostname} />
        </div>
      </header>

      {/* Section B: Primary Performance Score */}
      <PerformanceGauge score={activeScore} device={selectedDevice} />

      {/* Section E: The Plain-English Summary */}
      <ResultsSummary aiAnalysis={report.aiAnalysis} />

      {/* Section C: Performance Metrics */}
      {currentRun?.metrics && (
        <section aria-labelledby="lab-metrics-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2
                id="lab-metrics-heading"
                className="text-xl sm:text-2xl font-bold text-slate-950"
              >
                {selectedDevice === "MOBILE" ? "Mobile" : "Desktop"} Laboratory
                Performance Metrics
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Measured in a controlled Google Lighthouse environment. Note:
                Total Blocking Time (TBT) is a laboratory diagnostic proxy for
                main-thread busyness, not real-user Interaction to Next Paint
                (INP).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard metric={currentRun.metrics.lcp} />
            <MetricCard metric={currentRun.metrics.fcp} />
            <MetricCard metric={currentRun.metrics.tbt} />
            <MetricCard metric={currentRun.metrics.cls} />
            <MetricCard metric={currentRun.metrics.speedIndex} />
          </div>
        </section>
      )}

      {/* Section D: Real-World Core Web Vitals */}
      <CoreWebVitalsPanel crux={currentCrux} device={selectedDevice} />

      {/* Section 8: Optimization Opportunities */}
      <section aria-labelledby="opportunities-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2
              id="opportunities-heading"
              className="text-xl sm:text-2xl font-bold text-slate-950"
            >
              What&apos;s Slowing Your Website Down?
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              These are the improvements worth looking at first based on your{" "}
              {selectedDevice === "MOBILE" ? "mobile" : "desktop"} Lighthouse
              findings. Individual savings estimates can overlap and should not
              be summed into a single guaranteed total.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Showing {visibleOpportunities.length} of {opportunities.length}{" "}
            identified opportunities
          </span>
        </div>

        {opportunities.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-sm text-emerald-950">
            <p className="font-semibold">
              No major optimization bottlenecks were found on{" "}
              {selectedDevice === "MOBILE" ? "mobile" : "desktop"}.
            </p>
            <p className="mt-1 text-emerald-800">
              Your page passed all primary Lighthouse opportunity audits for
              this device category.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleOpportunities.map((opp) => (
              <OpportunityCard
                key={opp.title}
                opportunity={opp}
                auditId={report.id}
              />
            ))}

            {opportunities.length > 5 && !showAllOpportunities && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllOpportunities(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  <span>
                    Show All {opportunities.length} Optimization Opportunities
                  </span>
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section 9: Barking Otter Optimization Assessment */}
      <OptimizationAssessment
        opportunities={opportunities}
        detectedPlatform={report.detectedPlatform}
        platformSignals={report.platformSignals}
      />

      {/* Section 11: Primary Conversion CTA Section */}
      <ConversionCTA
        score={activeScore}
        auditId={report.id}
        hostname={report.hostname}
        onSelectCta={scrollToLeadForm}
      />

      {/* Section 12: Lead Capture Form */}
      <LeadCaptureForm
        auditId={report.id}
        defaultWebsiteUrl={report.normalizedUrl}
        selectedSource={leadCtaSource}
      />

      {/* Mobile Sticky Bottom CTA Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-900">
              Need help fixing these issues?
            </p>
            <p className="truncate text-[11px] text-slate-500">
              Barking Otter handles the optimization work.
            </p>
          </div>
          <button
            type="button"
            onClick={() => scrollToLeadForm("OPTIMIZATION_PLAN")}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white"
          >
            <span>Have Us Fix It</span>
            <ArrowRight className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
