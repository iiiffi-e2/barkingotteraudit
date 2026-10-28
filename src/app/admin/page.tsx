import React from "react";
import Link from "next/link";
import { AdminStats } from "@/components/admin/AdminStats";
import { ArrowRight } from "lucide-react";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950">
            Operational Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor website performance assessments, conversion activity, and
            API usage across Barking Otter.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/audits"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <span>All Historical Scans</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800"
          >
            <span>Manage Leads</span>
            <ArrowRight className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <AdminStats />
    </div>
  );
}
