import React from "react";
import { NormalizedCruxSnapshot } from "@/types/audit";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Globe,
} from "lucide-react";

interface CoreWebVitalsPanelProps {
  crux: NormalizedCruxSnapshot | null;
  device: "MOBILE" | "DESKTOP";
}

export function CoreWebVitalsPanel({ crux, device }: CoreWebVitalsPanelProps) {
  const deviceLabel = device === "MOBILE" ? "Mobile" : "Desktop";
  const isAvailable = crux && crux.dataScope !== "UNAVAILABLE";

  return (
    <section
      aria-labelledby="crux-heading"
      className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="crux-heading"
                className="text-lg sm:text-xl font-bold text-slate-950"
              >
                How Real Visitors Experience Your Website
              </h2>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {deviceLabel} Field Data (CrUX)
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Based on 28-day 75th-percentile measurements from real Chrome
              visitors—distinct from single-run laboratory Lighthouse tests.
            </p>
          </div>
        </div>

        {isAvailable && (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                crux.overallStatus === "PASSED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : crux.overallStatus === "FAILED"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-slate-100 text-slate-700"
              }`}
            >
              {crux.overallStatus === "PASSED" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Core Web Vitals: Passed</span>
                </>
              ) : crux.overallStatus === "FAILED" ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                  <span>Core Web Vitals: Needs Improvement</span>
                </>
              ) : (
                <span>Assessment Incomplete</span>
              )}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
              <Globe className="h-3 w-3 text-slate-500" aria-hidden="true" />
              <span>
                {crux.dataScope === "PAGE"
                  ? "Page-Level Data"
                  : "Origin-Level Fallback Data"}
              </span>
            </span>
          </div>
        )}
      </div>

      {!isAvailable ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-700">
          <Info
            className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-slate-900">
              Not enough real-world visitor data is available for this page.
              We&apos;ve still completed a laboratory performance analysis.
            </p>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Google&apos;s Chrome UX Report only publishes real-user Core Web
              Vitals once a page or domain reaches sufficient public Chrome
              traffic volume. Missing field data does not mean your website
              failed—use the Lighthouse laboratory metrics above to evaluate
              your loading performance.
            </p>
          </div>
        </div>
      ) : (
        <>
          {crux.dataScope === "ORIGIN" && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-xs text-amber-950">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                aria-hidden="true"
              />
              <span>
                <strong>Origin-level fallback:</strong> Page-specific traffic
                volume was below Google&apos;s reporting threshold, so these
                values reflect real visitor experiences across the entire{" "}
                <span className="font-semibold">{crux.sourceIdentifier}</span>{" "}
                website origin.
              </span>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[crux.metrics.lcp, crux.metrics.inp, crux.metrics.cls].map((m) => {
              const badgeStyle =
                m.status === "good"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : m.status === "needs-improvement"
                  ? "bg-amber-50 text-amber-900 border-amber-200"
                  : m.status === "poor"
                  ? "bg-red-50 text-red-800 border-red-200"
                  : "bg-slate-100 text-slate-600 border-slate-200";

              const statusText =
                m.status === "good"
                  ? "Good"
                  : m.status === "needs-improvement"
                  ? "Needs Improvement"
                  : m.status === "poor"
                  ? "Poor"
                  : "Unavailable";

              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {m.acronym} (75th Percentile)
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeStyle}`}
                    >
                      {m.status === "good" && (
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      )}
                      {m.status === "needs-improvement" && (
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      )}
                      {m.status === "poor" && (
                        <XCircle className="h-3 w-3" aria-hidden="true" />
                      )}
                      <span>{statusText}</span>
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-medium text-slate-700">
                    {m.label}
                  </p>

                  <p className="mt-3 text-2xl font-bold text-slate-950 tabular-nums">
                    {m.displayValue}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Good threshold: {m.goodThresholdLabel}
                  </p>

                  {m.distribution && (
                    <div className="mt-3">
                      <div
                        className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200"
                        aria-label={`Visitor distribution: ${m.distribution.good}% good, ${m.distribution.needsImprovement}% needs improvement, ${m.distribution.poor}% poor`}
                      >
                        <div
                          style={{ width: `${m.distribution.good}%` }}
                          className="bg-emerald-500"
                        />
                        <div
                          style={{
                            width: `${m.distribution.needsImprovement}%`,
                          }}
                          className="bg-amber-500"
                        />
                        <div
                          style={{ width: `${m.distribution.poor}%` }}
                          className="bg-red-500"
                        />
                      </div>
                      <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 tabular-nums">
                        <span>{m.distribution.good}% good</span>
                        <span>{m.distribution.needsImprovement}% moderate</span>
                        <span>{m.distribution.poor}% poor</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {crux.collectionPeriod && (
            <p className="mt-4 text-xs text-slate-500">
              Collection period: {crux.collectionPeriod.firstDate} to{" "}
              {crux.collectionPeriod.lastDate} (28-day rolling Chrome UX Report
              window).
            </p>
          )}
        </>
      )}
    </section>
  );
}
