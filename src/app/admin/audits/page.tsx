import React from "react";
import { AuditTable } from "@/components/admin/AuditTable";

export default function AdminAuditsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950">
          Historical Website Audits
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Search, filter, inspect, and rerun stored performance assessments.
        </p>
      </div>

      <AuditTable />
    </div>
  );
}
