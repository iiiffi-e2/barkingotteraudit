import React from "react";
import { NormalizedOpportunity } from "@/types/audit";
import { ExternalLink, Code2, FileCode } from "lucide-react";

interface OpportunityDetailsProps {
  opportunity: NormalizedOpportunity;
}

export function OpportunityDetails({ opportunity }: OpportunityDetailsProps) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 text-xs sm:text-sm text-slate-700 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <span className="font-semibold text-slate-900">
            Lighthouse Technical Diagnostics
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {opportunity.sourceAuditIds.map((id) => (
            <code
              key={id}
              className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-700"
            >
              {id}
            </code>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Original Lighthouse Audit Title
          </p>
          <p className="mt-1 font-medium text-slate-900">
            {opportunity.originalTitle}
          </p>
        </div>

        {opportunity.estimatedSavings.displayValue && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Measured / Estimated Audit Savings
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {opportunity.estimatedSavings.displayValue}
            </p>
          </div>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Technical Implementation Recommendation
        </p>
        <p className="mt-1 text-slate-700 leading-relaxed">
          {opportunity.technicalRecommendation}
        </p>
      </div>

      {opportunity.evidence.items && opportunity.evidence.items.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Affected Assets &amp; Resources ({opportunity.evidence.items.length})
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Resource / Asset</th>
                  <th className="px-3 py-2 font-semibold">Transfer Size</th>
                  <th className="px-3 py-2 font-semibold">Est. Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opportunity.evidence.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-800 max-w-xs truncate">
                      <span className="inline-flex items-center gap-1.5">
                        <FileCode
                          className="h-3.5 w-3.5 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {item.url || item.label || "Page asset"}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 tabular-nums">
                      {item.TransferSizeDisplay || "—"}
                    </td>
                    <td className="px-3 py-2 font-medium text-amber-800 tabular-nums">
                      {item.savingsDisplay || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {opportunity.documentationUrl && (
        <div className="pt-1">
          <a
            href={opportunity.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 underline underline-offset-4 hover:text-amber-700"
          >
            <span>Read official Chrome Lighthouse documentation</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}
