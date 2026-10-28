import React from "react";
import { NormalizedOpportunity } from "@/types/audit";
import {
  Wrench,
  CheckCircle2,
  Search,
  ServerCog,
  Cpu,
  Info,
} from "lucide-react";

interface OptimizationAssessmentProps {
  opportunities: NormalizedOpportunity[];
  detectedPlatform: string | null;
  platformSignals: string[];
}

export function OptimizationAssessment({
  opportunities,
  detectedPlatform,
  platformSignals,
}: OptimizationAssessmentProps) {
  const straightforward = opportunities.filter(
    (o) => o.complexity === "STRAIGHTFORWARD"
  );
  const investigation = opportunities.filter(
    (o) => o.complexity === "INVESTIGATION"
  );
  const complex = opportunities.filter((o) => o.complexity === "COMPLEX");

  return (
    <section
      aria-labelledby="bo-assessment-heading"
      className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
            <Wrench className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="bo-assessment-heading"
              className="text-lg sm:text-xl font-bold text-slate-950"
            >
              What Can Barking Otter Improve?
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              A preliminary engineering assessment grouping your audit findings
              by implementation scope and complexity.
            </p>
          </div>
        </div>

        {/* Platform Detection Badge */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs">
          <Cpu className="h-4 w-4 text-slate-500 shrink-0" aria-hidden="true" />
          <div>
            <span className="text-slate-500">Detected Platform: </span>
            <span
              data-testid="detected-platform-label"
              className="font-semibold text-slate-900"
            >
              {detectedPlatform || "Not determined"}
            </span>
          </div>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <div className="mt-6 rounded-xl bg-emerald-50/70 border border-emerald-200 p-5 text-sm text-emerald-950">
          <p className="font-semibold">
            Your page passed all primary Lighthouse opportunity checks.
          </p>
          <p className="mt-1 text-emerald-800">
            Barking Otter can still assist with ongoing Core Web Vitals
            monitoring, pre-launch audits, or testing additional key templates
            such as product, service, or landing pages.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Column 1: Likely Straightforward Improvements */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 p-5">
            <div>
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <h3 className="text-sm font-bold text-slate-950">
                  Likely Straightforward Improvements
                </h3>
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                High-confidence asset, image format, font-display, and caching
                adjustments that rarely require structural code changes.
              </p>

              {straightforward.length > 0 ? (
                <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-slate-800">
                  {straightforward.map((item) => (
                    <li
                      key={item.title}
                      className="flex items-start gap-2 rounded-lg bg-white p-2.5 border border-slate-200/70"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.category} · Confidence: {item.confidence}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">
                  No unoptimized image, font, or basic cache items were flagged
                  in this category.
                </p>
              )}
            </div>
          </div>

          {/* Column 2: Improvements Requiring Investigation */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 p-5">
            <div>
              <div className="flex items-center gap-2 text-amber-700">
                <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                <h3 className="text-sm font-bold text-slate-950">
                  Improvements Requiring Investigation
                </h3>
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                Script execution, CSS delivery, plugin/theme assets, and
                third-party integrations that require reviewing your site setup.
              </p>

              {investigation.length > 0 ? (
                <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-slate-800">
                  {investigation.map((item) => (
                    <li
                      key={item.title}
                      className="flex items-start gap-2 rounded-lg bg-white p-2.5 border border-slate-200/70"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.category} · Confidence: {item.confidence}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">
                  No moderate script or stylesheet dependency bottlenecks were
                  flagged in this category.
                </p>
              )}
            </div>
          </div>

          {/* Column 3: Potentially Complex Changes */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 p-5">
            <div>
              <div className="flex items-center gap-2 text-slate-700">
                <ServerCog className="h-4 w-4 shrink-0" aria-hidden="true" />
                <h3 className="text-sm font-bold text-slate-950">
                  Potentially Complex Changes
                </h3>
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                Server response times, hosting constraints, or deep DOM/main-thread
                workloads that may depend on platform architecture.
              </p>

              {complex.length > 0 ? (
                <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-slate-800">
                  {complex.map((item) => (
                    <li
                      key={item.title}
                      className="flex items-start gap-2 rounded-lg bg-white p-2.5 border border-slate-200/70"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-700"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.category} · Confidence: {item.confidence}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">
                  No severe server latency or structural main-thread bottlenecks
                  were flagged in this category.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Platform-Agnostic Positioning & Honest Assessment Note */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3.5 text-xs text-slate-600 leading-relaxed">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <div>
          <p>
            <strong className="text-slate-900">
              Platform-agnostic optimization:
            </strong>{" "}
            Barking Otter optimizes websites built on WordPress, Shopify,
            Webflow, Squarespace, Wix, Next.js, React, Astro, and custom stacks.
            {platformSignals.length > 0 && (
              <span>
                {" "}
                ({platformSignals.join("; ")}.)
              </span>
            )}{" "}
            This classification is a preliminary assessment based on external
            Lighthouse evidence—confirming exact implementation steps requires a
            brief review of your site&apos;s architecture, hosting access, and
            technical constraints.
          </p>
        </div>
      </div>
    </section>
  );
}
