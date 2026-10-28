"use client";

import React, { useState } from "react";
import { NormalizedLabMetric } from "@/types/audit";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface MetricCardProps {
  metric: NormalizedLabMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    good: {
      label: "Good",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      dotClass: "bg-emerald-600",
      Icon: CheckCircle2,
    },
    "needs-improvement": {
      label: "Needs Improvement",
      badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
      dotClass: "bg-amber-500",
      Icon: AlertTriangle,
    },
    poor: {
      label: "Poor",
      badgeClass: "bg-red-50 text-red-800 border-red-200",
      dotClass: "bg-red-600",
      Icon: XCircle,
    },
    unknown: {
      label: "Unavailable",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      dotClass: "bg-slate-400",
      Icon: HelpCircle,
    },
  }[metric.status];

  const StatusIcon = statusConfig.Icon;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all hover:border-slate-300">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {metric.acronym}
            </span>
            <h3 className="mt-0.5 text-sm font-semibold text-slate-900">
              {metric.label}
            </h3>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConfig.badgeClass}`}
          >
            <StatusIcon className="h-3 w-3" aria-hidden="true" />
            <span>{statusConfig.label}</span>
          </span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 tabular-nums">
            {metric.displayValue}
          </span>
        </div>

        <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {metric.plainDescription}
        </p>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <span className="inline-flex items-center gap-1">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Good target: {metric.thresholds.good}</span>
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>

        {expanded && (
          <div className="mt-2.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed space-y-1.5">
            <p>{metric.detailedExplanation}</p>
            <p className="text-[11px] text-slate-500">
              Thresholds: Good ({metric.thresholds.good}) · Poor (
              {metric.thresholds.poor})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
