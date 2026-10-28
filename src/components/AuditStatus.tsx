import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export interface StageStep {
  key: string;
  label: string;
  description: string;
}

export const ANALYSIS_STAGES: StageStep[] = [
  {
    key: "QUEUED",
    label: "Preparing your analysis",
    description: "Validating target URL and initializing the test runner.",
  },
  {
    key: "ANALYZING_MOBILE",
    label: "Checking mobile performance",
    description:
      "Running a Lighthouse mobile audit over simulated cellular conditions.",
  },
  {
    key: "ANALYZING_DESKTOP",
    label: "Checking desktop performance",
    description:
      "Running a Lighthouse desktop audit for broadband and large screens.",
  },
  {
    key: "REVIEWING_METRICS",
    label: "Reviewing performance metrics",
    description:
      "Extracting LCP, FCP, TBT, CLS, Speed Index, and Chrome UX Report field data.",
  },
  {
    key: "IDENTIFYING_OPPORTUNITIES",
    label: "Identifying optimization opportunities",
    description:
      "Evaluating asset bottlenecks, script overhead, and caching rules.",
  },
  {
    key: "PREPARING_REPORT",
    label: "Preparing your report",
    description:
      "Generating plain-English explanations and organizing priorities.",
  },
];

interface AuditStatusProps {
  currentStatus: string;
}

export function AuditStatus({ currentStatus }: AuditStatusProps) {
  const activeIdx = Math.max(
    0,
    ANALYSIS_STAGES.findIndex((s) => s.key === currentStatus)
  );

  return (
    <ol aria-label="Analysis stages" className="space-y-3 text-left">
      {ANALYSIS_STAGES.map((stage, index) => {
        const isCompleted = index < activeIdx;
        const isCurrent = index === activeIdx;

        return (
          <li
            key={stage.key}
            className={`flex items-start gap-3.5 rounded-xl border px-4 py-3 transition-all ${
              isCurrent
                ? "border-slate-900 bg-white shadow-xs"
                : isCompleted
                ? "border-emerald-200/80 bg-emerald-50/40"
                : "border-slate-200/70 bg-slate-50/50 opacity-65"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isCompleted ? (
                <CheckCircle2
                  className="h-5 w-5 text-emerald-600"
                  aria-label="Completed"
                />
              ) : isCurrent ? (
                <Loader2
                  className="h-5 w-5 animate-spin text-amber-600"
                  aria-label="In progress"
                />
              ) : (
                <Circle
                  className="h-5 w-5 text-slate-300"
                  aria-label="Pending"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold ${
                  isCurrent
                    ? "text-slate-950"
                    : isCompleted
                    ? "text-slate-800"
                    : "text-slate-500"
                }`}
              >
                {stage.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {stage.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
