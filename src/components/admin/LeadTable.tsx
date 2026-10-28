"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, ExternalLink, Save, Check } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

interface LeadListItem {
  id: string;
  auditId: string | null;
  name: string;
  email: string;
  company: string | null;
  websiteUrl: string;
  goalOrConcern: string | null;
  message: string | null;
  internalNotes: string | null;
  source: string;
  marketingConsent: boolean;
  status:
    | "NEW"
    | "CONTACTED"
    | "QUALIFIED"
    | "PROPOSAL_SENT"
    | "CONVERTED"
    | "CLOSED";
  createdAt: string;
  associatedAudit: {
    id: string;
    hostname: string;
    mobileScore: number | null;
    desktopScore: number | null;
  } | null;
}

const LEAD_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "CONVERTED", label: "Converted" },
  { value: "CLOSED", label: "Closed" },
] as const;

export function LeadTable() {
  const [items, setItems] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const loaded: LeadListItem[] = data.items || [];
        setItems(loaded);
        const initialDrafts: Record<string, string> = {};
        for (const l of loaded) {
          initialDrafts[l.id] = l.internalNotes || "";
        }
        setNotesDrafts(initialDrafts);
      }
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  async function handleUpdateLead(
    leadId: string,
    patch: { status?: string; internalNotes?: string }
  ) {
    const res = await fetch(`/api/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (res.ok) {
      setSavedId(leadId);
      setTimeout(() => setSavedId(null), 2000);
      await fetchLeads();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads by name, email, company, or website..."
            aria-label="Search leads"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter leads by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700"
        >
          <option value="ALL">All Lead Statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No Captured Leads Yet"
          description="Prospect requests submitted through report CTAs will appear here with their associated audit results."
        />
      ) : (
        <div className="space-y-4">
          {items.map((lead) => (
            <div
              key={lead.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-950">
                      {lead.name}
                    </h3>
                    {lead.company && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {lead.company}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      ({lead.email})
                    </span>
                  </div>

                  <p className="mt-1 text-xs sm:text-sm font-medium text-slate-800">
                    Website: <span className="font-mono">{lead.websiteUrl}</span>
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Source: {lead.source}</span>
                    <span>
                      Submitted:{" "}
                      {new Date(lead.createdAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <span>
                      Marketing Opt-In: {lead.marketingConsent ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {lead.associatedAudit && (
                    <Link
                      href={`/audit/${lead.associatedAudit.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      <span>
                        Audit Report (M:{" "}
                        {lead.associatedAudit.mobileScore ?? "—"} / D:{" "}
                        {lead.associatedAudit.desktopScore ?? "—"})
                      </span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}

                  <label htmlFor={`status-${lead.id}`} className="sr-only">
                    Lead status for {lead.name}
                  </label>
                  <select
                    id={`status-${lead.id}`}
                    value={lead.status}
                    onChange={(e) =>
                      handleUpdateLead(lead.id, { status: e.target.value })
                    }
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
                  >
                    {LEAD_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(lead.goalOrConcern || lead.message) && (
                <div className="rounded-xl bg-slate-50 p-3.5 text-xs sm:text-sm text-slate-700 space-y-1">
                  {lead.goalOrConcern && (
                    <p>
                      <strong className="text-slate-900">Goal:</strong>{" "}
                      {lead.goalOrConcern}
                    </p>
                  )}
                  {lead.message && (
                    <p>
                      <strong className="text-slate-900">Prospect Notes:</strong>{" "}
                      {lead.message}
                    </p>
                  )}
                </div>
              )}

              {/* Private Internal Admin Notes */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-1">
                <div className="flex-1">
                  <label
                    htmlFor={`notes-${lead.id}`}
                    className="block text-xs font-semibold text-slate-600"
                  >
                    Private Internal Notes (never visible on public reports)
                  </label>
                  <input
                    id={`notes-${lead.id}`}
                    type="text"
                    value={notesDrafts[lead.id] ?? ""}
                    onChange={(e) =>
                      setNotesDrafts((prev) => ({
                        ...prev,
                        [lead.id]: e.target.value,
                      }))
                    }
                    placeholder="Add internal qualification or follow-up notes..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateLead(lead.id, {
                      internalNotes: notesDrafts[lead.id] ?? "",
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  {savedId === lead.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                      <span>Save Note</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
