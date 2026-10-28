import React from "react";
import { AIReportInterpretation } from "@/types/audit";
import { Sparkles, FileText } from "lucide-react";

interface ResultsSummaryProps {
  aiAnalysis: {
    model: string;
    isFallback: boolean;
    output: AIReportInterpretation;
  } | null;
}

export function ResultsSummary({ aiAnalysis }: ResultsSummaryProps) {
  if (!aiAnalysis?.output) return null;

  const { headline, summary, overallAssessment } = aiAnalysis.output;

  return (
    <section
      aria-labelledby="plain-english-summary-heading"
      className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="plain-english-summary-heading"
              className="text-lg sm:text-xl font-bold text-slate-950"
            >
              Here&apos;s What We Found
            </h2>
            <p className="text-xs text-slate-500">
              Plain-English translation of your measured performance findings
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
          <span>
            {aiAnalysis.isFallback
              ? "Evidence-Based Diagnostic Summary"
              : "AI-Assisted Diagnostic Summary"}
          </span>
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-base sm:text-lg font-semibold text-slate-900">
          {headline}
        </p>
        <p
          data-testid="plain-english-summary-text"
          className="text-sm sm:text-base text-slate-700 leading-relaxed"
        >
          {summary}
        </p>
        {overallAssessment && (
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1 border-t border-slate-100">
            {overallAssessment}
          </p>
        )}
      </div>
    </section>
  );
}
