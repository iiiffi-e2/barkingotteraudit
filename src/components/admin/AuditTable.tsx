"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { getScoreBand } from "@/lib/utils";

interface AuditListItem {
  id: string;
  hostname: string;
  normalizedUrl: string;
  status: string;
  source: string;
  mobileScore: number | null;
  desktopScore: number | null;
  leadsCount: number;
  createdAt: string;
  completedAt: string | null;
}

export function AuditTable() {
  const [items, setItems] = useState<AuditListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [scoreBand, setScoreBand] = useState("ALL");
  const [daysFilter, setDaysFilter] = useState("0");
  const [sort, setSort] = useState("newest");
  const [rerunningId, setRerunningId] = useState<string | null>(null);

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (scoreBand !== "ALL") params.set("scoreBand", scoreBand);
      if (daysFilter !== "0") params.set("days", daysFilter);
      params.set("sort", sort);
      params.set("page", String(page));

      const res = await fetch(`/api/admin/audits?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, scoreBand, daysFilter, sort, page]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  async function handleAdminRerun(auditId: string) {
    setRerunningId(auditId);
    try {
      const res = await fetch(`/api/audits/${auditId}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchAudits();
      }
    } finally {
      setRerunningId(null);
    }
  }

  function renderScorePill(score: number | null) {
    if (score === null) {
      return <span className="text-xs text-slate-400">—</span>;
    }
    const band = getScoreBand(score);
    const cls =
      band === "good"
        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
        : band === "needs-improvement"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : "bg-red-50 text-red-800 border-red-200";
    return (
      <span
        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums ${cls}`}
      >
        {score}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by domain or URL..."
            aria-label="Search audits by domain or URL"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by score band"
            value={scoreBand}
            onChange={(e) => {
              setScoreBand(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Scores</option>
            <option value="good">Good (90–100)</option>
            <option value="needs-improvement">Needs Improvement (50–89)</option>
            <option value="poor">Poor (0–49)</option>
          </select>

          <select
            aria-label="Filter by audit status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARTIAL">Partial</option>
            <option value="FAILED">Failed</option>
            <option value="QUEUED">In Progress</option>
          </select>

          <select
            aria-label="Filter by date range"
            value={daysFilter}
            onChange={(e) => {
              setDaysFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            <option value="0">All Time</option>
            <option value="1">Last 24 Hours</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
          </select>

          <select
            aria-label="Sort audits"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="domain">Domain (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No Website Audits Found"
          description="No audits match your current filters, or no scans have been run yet."
          actionLabel="Run a Speed Test"
          actionHref="/speed-test"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Domain / URL</th>
                  <th className="px-4 py-3.5">Mobile</th>
                  <th className="px-4 py-3.5">Desktop</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Lead</th>
                  <th className="px-4 py-3.5">Source</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((audit) => (
                  <tr key={audit.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900">
                        {audit.hostname}
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-xs">
                        {audit.normalizedUrl}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      {renderScorePill(audit.mobileScore)}
                    </td>
                    <td className="px-4 py-3.5">
                      {renderScorePill(audit.desktopScore)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {audit.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {audit.leadsCount > 0 ? (
                        <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          {audit.leadsCount} Lead{audit.leadsCount > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {audit.source}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(audit.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/audit/${audit.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <span>Report</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          disabled={rerunningId === audit.id}
                          onClick={() => handleAdminRerun(audit.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${
                              rerunningId === audit.id ? "animate-spin" : ""
                            }`}
                            aria-hidden="true"
                          />
                          <span>Rerun</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
            <span>
              Total: <strong>{total}</strong> audit{total === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Prev</span>
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
