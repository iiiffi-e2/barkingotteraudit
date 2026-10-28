"use client";

import React from "react";
import { ArrowRight, MessageSquare, ShieldCheck } from "lucide-react";
import { getScoreBand } from "@/lib/utils";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface ConversionCTAProps {
  score: number | null;
  auditId: string;
  hostname: string;
  onSelectCta: (source: "OPTIMIZATION_PLAN" | "CONSULTATION") => void;
}

export function ConversionCTA({
  score,
  auditId,
  hostname,
  onSelectCta,
}: ConversionCTAProps) {
  const band = getScoreBand(score);

  let contextLine =
    "Your website has several significant performance opportunities.";
  if (band === "good") {
    contextLine = "Your website is in good shape. Keep it running that way.";
  } else if (band === "needs-improvement") {
    contextLine =
      "A few targeted improvements could make your website more efficient.";
  }

  function handleClick(source: "OPTIMIZATION_PLAN" | "CONSULTATION") {
    trackAnalyticsEvent("optimization_cta_clicked", {
      audit_id: auditId,
      hostname,
      score_band: band,
      conversion_source: source,
    });
    onSelectCta(source);
  }

  return (
    <section
      aria-labelledby="conversion-cta-heading"
      className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-10 sm:px-10 sm:py-12 text-white shadow-md"
    >
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
          <span>{contextLine}</span>
        </span>

        <h2
          id="conversion-cta-heading"
          className="mt-4 text-2xl sm:text-4xl font-bold tracking-tight text-white"
        >
          We Found the Problems. We Can Fix Them.
        </h2>

        <p className="mx-auto mt-3.5 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
          Stop trying to figure out caching, JavaScript, image optimization, and
          technical performance issues yourself. Barking Otter handles the heavy
          lifting.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={() => handleClick("OPTIMIZATION_PLAN")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm sm:text-base font-bold text-slate-950 shadow-xs hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <span>Get My Optimization Plan</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => handleClick("CONSULTATION")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-6 py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <MessageSquare className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <span>Talk to Barking Otter</span>
          </button>
        </div>

        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span>
            No obligation. We&apos;ll review your results and recommend the next
            steps.
          </span>
        </p>
      </div>
    </section>
  );
}
