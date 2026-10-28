import React from "react";
import {
  getContextualScoreHeadline,
  getScoreBand,
  getScoreLabel,
} from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

interface PerformanceGaugeProps {
  score: number | null | undefined;
  device: "MOBILE" | "DESKTOP";
}

export function PerformanceGauge({ score, device }: PerformanceGaugeProps) {
  const band = getScoreBand(score);
  const label = getScoreLabel(score);
  const { headline, subheadline } = getContextualScoreHeadline(score, device);

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const clampedScore =
    score !== null && score !== undefined
      ? Math.max(0, Math.min(100, score))
      : 0;
  const dashOffset =
    circumference - (clampedScore / 100) * circumference;

  const colorMap = {
    good: {
      stroke: "#059669", // emerald-600
      track: "#d1fae5",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      text: "text-emerald-700",
      Icon: CheckCircle2,
    },
    "needs-improvement": {
      stroke: "#d97706", // amber-600
      track: "#fef3c7",
      badgeBg: "bg-amber-50 text-amber-900 border-amber-200",
      text: "text-amber-700",
      Icon: AlertTriangle,
    },
    poor: {
      stroke: "#dc2626", // red-600
      track: "#fee2e2",
      badgeBg: "bg-red-50 text-red-800 border-red-200",
      text: "text-red-700",
      Icon: XCircle,
    },
    unknown: {
      stroke: "#64748b",
      track: "#e2e8f0",
      badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
      text: "text-slate-600",
      Icon: HelpCircle,
    },
  }[band];

  const StatusIcon = colorMap.Icon;

  return (
    <div className="flex flex-col md:flex-row items-center gap-8 rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xs">
      {/* Circular SVG Score Visualization */}
      <div className="relative flex flex-col items-center shrink-0">
        <div
          className="relative flex h-40 w-40 items-center justify-center"
          role="img"
          aria-label={`${
            device === "MOBILE" ? "Mobile" : "Desktop"
          } Lighthouse Performance Score: ${
            score !== null && score !== undefined ? `${score} out of 100` : "Unavailable"
          } (${label})`}
        >
          <svg
            className="h-full w-full -rotate-90 transform"
            viewBox="0 0 152 152"
            aria-hidden="true"
          >
            <circle
              cx="76"
              cy="76"
              r={radius}
              fill="none"
              stroke={colorMap.track}
              strokeWidth="12"
            />
            {score !== null && score !== undefined && (
              <circle
                cx="76"
                cy="76"
                r={radius}
                fill="none"
                stroke={colorMap.stroke}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700 ease-out"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span
              data-testid="primary-performance-score"
              className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-950 tabular-nums"
            >
              {score !== null && score !== undefined ? score : "—"}
            </span>
            <span className="mt-0.5 text-xs font-medium text-slate-500">
              out of 100
            </span>
          </div>
        </div>

        <span
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${colorMap.badgeBg}`}
        >
          <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{label}</span>
        </span>
      </div>

      {/* Contextual Headline & Legend */}
      <div className="flex-1 text-center md:text-left">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span>
            {device === "MOBILE" ? "Mobile" : "Desktop"} Lighthouse Performance
          </span>
        </div>

        <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-950 leading-snug">
          {headline}
        </h2>

        <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
          {subheadline}
        </p>

        {/* Score Scale Legend */}
        <div
          aria-label="Lighthouse score scale legend"
          className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-4 border-t border-slate-100 pt-4 text-xs text-slate-600"
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full bg-red-600"
              aria-hidden="true"
            />
            <span>0–49: Poor</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full bg-amber-500"
              aria-hidden="true"
            />
            <span>50–89: Needs Improvement</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full bg-emerald-600"
              aria-hidden="true"
            />
            <span>90–100: Good</span>
          </span>
        </div>
      </div>
    </div>
  );
}
