import React from "react";
import { AdminSettingsForm } from "@/components/admin/AdminSettingsForm";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950">
          Tool Configuration &amp; Guardrails
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage public rate limits, report cache policies, AI interpretation
          settings, and internal lead notification recipients.
        </p>
      </div>

      <AdminSettingsForm />
    </div>
  );
}
