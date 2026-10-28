import React from "react";
import { LeadTable } from "@/components/admin/LeadTable";

export default function AdminLeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950">
          Captured Optimization Leads
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Review prospect inquiries, open their associated website performance
          reports, and update lead pipeline statuses.
        </p>
      </div>

      <LeadTable />
    </div>
  );
}
