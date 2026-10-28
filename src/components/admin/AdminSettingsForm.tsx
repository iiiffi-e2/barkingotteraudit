"use client";

import React, { useEffect, useState } from "react";
import { Save, CheckCircle2, ShieldCheck } from "lucide-react";
import { AppSettings } from "@/lib/settings";

export function AdminSettingsForm() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<Record<
    string,
    boolean
  > | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
        if (data.integrationStatus)
          setIntegrationStatus(data.integrationStatus);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSavedBanner(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setSavedBanner(true);
        setTimeout(() => setSavedBanner(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    );
  }

  return (
    <div className="space-y-6">
      {/* Integration Status Overview (Credentials Never Exposed) */}
      {integrationStatus && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-950">
              Environment Credential Status (Read-Only)
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            API keys are stored securely in server-side environment variables
            and are never displayed in the admin interface.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5 text-xs">
            {[
              {
                label: "PageSpeed API Key",
                ok: integrationStatus.pageSpeedKeyConfigured,
              },
              {
                label: "CrUX API Key",
                ok: integrationStatus.cruxKeyConfigured,
              },
              {
                label: "AI Provider Key",
                ok: integrationStatus.aiKeyConfigured,
              },
              {
                label: "Resend Email Key",
                ok: integrationStatus.resendKeyConfigured,
              },
              {
                label: "GA4 Measurement ID",
                ok: integrationStatus.ga4Configured,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5"
              >
                <span className="font-medium text-slate-700">{item.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    item.ok
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {item.ok ? "Configured" : "Default/Fallback"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configurable Operational Settings */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs space-y-6"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Analyzer Configuration &amp; Guardrails
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Configure rate limits, cache windows, AI report interpretation, and
            internal lead notification recipients.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label
              htmlFor="setting-rate-limit"
              className="block text-xs font-semibold text-slate-800"
            >
              Public Audits Per Hour (per IP)
            </label>
            <input
              id="setting-rate-limit"
              type="number"
              min={1}
              max={1000}
              value={settings.publicRateLimitPerHour}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  publicRateLimitPerHour: Number(e.target.value) || 20,
                })
              }
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="setting-cache-hours"
              className="block text-xs font-semibold text-slate-800"
            >
              Audit Cache Lifetime (Hours)
            </label>
            <input
              id="setting-cache-hours"
              type="number"
              min={0}
              max={720}
              value={settings.cacheLifetimeHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  cacheLifetimeHours: Number(e.target.value),
                })
              }
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="setting-retention-days"
              className="block text-xs font-semibold text-slate-800"
            >
              Report Retention Period (Days)
            </label>
            <input
              id="setting-retention-days"
              type="number"
              min={1}
              max={3650}
              value={settings.reportRetentionDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  reportRetentionDays: Number(e.target.value) || 90,
                })
              }
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="setting-ai-provider"
              className="block text-xs font-semibold text-slate-800"
            >
              Interpretation Engine Mode
            </label>
            <select
              id="setting-ai-provider"
              value={settings.aiProvider}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  aiProvider: e.target.value as AppSettings["aiProvider"],
                })
              }
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
            >
              <option value="openai">
                OpenAI-Compatible LLM (with deterministic fallback)
              </option>
              <option value="anthropic">
                Anthropic-Compatible Gateway (with deterministic fallback)
              </option>
              <option value="deterministic">
                Deterministic Rule Engine Only
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="setting-ai-model"
              className="block text-xs font-semibold text-slate-800"
            >
              AI Model Identifier
            </label>
            <input
              id="setting-ai-model"
              type="text"
              value={settings.aiModel}
              onChange={(e) =>
                setSettings({ ...settings, aiModel: e.target.value })
              }
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="setting-recipients"
            className="block text-xs font-semibold text-slate-800"
          >
            Internal Lead Notification Recipients (comma-separated emails)
          </label>
          <input
            id="setting-recipients"
            type="text"
            value={settings.notificationRecipients}
            onChange={(e) =>
              setSettings({
                ...settings,
                notificationRecipients: e.target.value,
              })
            }
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
          />
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4 text-sm">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.aiAnalysisEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  aiAnalysisEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            <span className="text-xs sm:text-sm font-medium text-slate-800">
              Enable AI report interpretation when API key is configured
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableOriginCruxFallback}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  enableOriginCruxFallback: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            <span className="text-xs sm:text-sm font-medium text-slate-800">
              Fall back to origin-level CrUX field data (explicitly labeled)
              when page-level traffic is insufficient
            </span>
          </label>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
          >
            <Save className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <span>{saving ? "Saving..." : "Save Configuration"}</span>
          </button>

          {savedBanner && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Settings updated</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
