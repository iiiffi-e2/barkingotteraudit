"use client";

import React, { useState } from "react";
import { NormalizedOpportunity } from "@/types/audit";
import { OpportunityDetails } from "@/components/OpportunityDetails";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Layers,
} from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface OpportunityCardProps {
  opportunity: NormalizedOpportunity;
  auditId?: string;
}

export function OpportunityCard({
  opportunity,
  auditId,
}: OpportunityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const priorityBadge = {
    HIGH: {
      label: "High priority",
      className: "bg-red-50 text-red-800 border-red-200",
    },
    MEDIUM: {
      label: "Medium priority",
      className: "bg-amber-50 text-amber-900 border-amber-200",
    },
    LOW: {
      label: "Low priority",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    },
  }[opportunity.priority];

  function toggleDetails() {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      trackAnalyticsEvent("opportunity_expanded", {
        audit_id: auditId,
        opportunity_category: opportunity.category,
        opportunity_priority: opportunity.priority,
      });
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs transition-all hover:border-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${priorityBadge.className}`}
            >
              {priorityBadge.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              <Layers className="h-3 w-3 text-slate-500" aria-hidden="true" />
              <span>{opportunity.category}</span>
            </span>
          </div>

          <h3 className="pt-1 text-base sm:text-lg font-bold text-slate-950">
            {opportunity.title}
          </h3>
        </div>

        {opportunity.estimatedSavings.displayValue && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-1 text-xs font-semibold text-amber-900">
            <Clock className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
            <span>{opportunity.estimatedSavings.displayValue}</span>
          </span>
        )}
      </div>

      <p className="mt-3 text-sm sm:text-base text-slate-700 leading-relaxed">
        {opportunity.explanation}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl bg-slate-50/80 p-4 text-xs sm:text-sm">
        <div>
          <p className="font-semibold text-slate-900">Why it matters</p>
          <p className="mt-1 text-slate-600 leading-relaxed">
            {opportunity.whyItMatters}
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-900 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            <span>Potential solution</span>
          </p>
          <p className="mt-1 text-slate-600 leading-relaxed">
            {opportunity.recommendation}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500">
          {opportunity.evidence.items.length > 0
            ? `${opportunity.evidence.items.length} affected resource${
                opportunity.evidence.items.length === 1 ? "" : "s"
              } identified`
            : `Audit ID: ${opportunity.sourceAuditIds.join(", ")}`}
        </span>

        <button
          type="button"
          onClick={toggleDetails}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer"
        >
          <span>
            {expanded ? "Hide Technical Details" : "View Technical Details"}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded && <OpportunityDetails opportunity={opportunity} />}
    </article>
  );
}
