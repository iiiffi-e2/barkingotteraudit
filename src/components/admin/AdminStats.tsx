"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Globe,
  Smartphone,
  Monitor,
  Users,
  TrendingUp,
  AlertTriangle,
  Cpu,
} from "lucide-react";

interface AdminStatsPayload {
  totalAudits: number;
  uniqueWebsitesTested: number;
  averageMobileScore: number | null;
  averageDesktopScore: number | null;
  scoreDistribution: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
  leadSubmissions: number;
  conversionRatePercent: number;
  scanFailures: number;
  auditsOverTime: Array<{ date: string; count: number }>;
  estimatedUsage: {
    pageSpeedApiCalls: number;
    cruxApiQueries: number;
    aiModelInterpretations: number;
  };
}

export function AdminStats() {
  const [stats, setStats] = useState<AdminStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
          />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Unable to load dashboard statistics.
      </div>
    );
  }

  const maxDailyCount = Math.max(
    1,
    ...stats.auditsOverTime.map((d) => d.count)
  );

  return (
    <div className="space-y-6">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Total Audits</span>
            <Activity className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950 tabular-nums">
            {stats.totalAudits}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.uniqueWebsitesTested} unique domains tested
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Avg Mobile / Desktop</span>
            <div className="flex items-center gap-1 text-slate-400">
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950 tabular-nums">
            {stats.averageMobileScore ?? "—"} /{" "}
            {stats.averageDesktopScore ?? "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Mean Lighthouse Performance (0–100)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Captured Leads</span>
            <Users className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950 tabular-nums">
            {stats.leadSubmissions}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.conversionRatePercent}% audit-to-lead conversion rate
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Scan Failures</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950 tabular-nums">
            {stats.scanFailures}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Unreachable or bot-blocked targets
          </p>
        </div>
      </div>

      {/* Charts & Operational Intelligence Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Audits Over Time (Last 7 Days) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-950">
              Audits Over Time (Last 7 Days)
            </h2>
            <TrendingUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-5 flex h-36 items-end justify-between gap-2 pt-4">
            {stats.auditsOverTime.map((item) => {
              const heightPct = Math.max(
                8,
                Math.round((item.count / maxDailyCount) * 100)
              );
              return (
                <div
                  key={item.date}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <span className="text-[11px] font-semibold text-slate-700 tabular-nums">
                    {item.count}
                  </span>
                  <div className="w-full flex items-end justify-center h-20 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-slate-900 rounded-t-md"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {item.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Score Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-950">
              Mobile Score Distribution
            </h2>
            <Globe className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>Good (90–100)</span>
                <span className="tabular-nums">
                  {stats.scoreDistribution.good}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  style={{
                    width: `${
                      stats.totalAudits
                        ? Math.min(
                            100,
                            (stats.scoreDistribution.good / stats.totalAudits) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>Needs Improvement (50–89)</span>
                <span className="tabular-nums">
                  {stats.scoreDistribution.needsImprovement}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  style={{
                    width: `${
                      stats.totalAudits
                        ? Math.min(
                            100,
                            (stats.scoreDistribution.needsImprovement /
                              stats.totalAudits) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                  className="h-full bg-amber-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>Poor (0–49)</span>
                <span className="tabular-nums">
                  {stats.scoreDistribution.poor}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  style={{
                    width: `${
                      stats.totalAudits
                        ? Math.min(
                            100,
                            (stats.scoreDistribution.poor / stats.totalAudits) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                  className="h-full bg-red-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Estimated API and AI Usage */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-950">
              Estimated API &amp; AI Usage
            </h2>
            <Cpu className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <dl className="mt-5 space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
              <dt className="text-slate-600">PageSpeed Insights Runs</dt>
              <dd className="font-bold text-slate-950 tabular-nums">
                {stats.estimatedUsage.pageSpeedApiCalls}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
              <dt className="text-slate-600">CrUX Field API Queries</dt>
              <dd className="font-bold text-slate-950 tabular-nums">
                {stats.estimatedUsage.cruxApiQueries}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
              <dt className="text-slate-600">Live LLM Interpretations</dt>
              <dd className="font-bold text-slate-950 tabular-nums">
                {stats.estimatedUsage.aiModelInterpretations}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
