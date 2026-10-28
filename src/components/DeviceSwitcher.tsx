"use client";

import React from "react";
import { Smartphone, Monitor } from "lucide-react";
import { getScoreBand } from "@/lib/utils";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface DeviceSwitcherProps {
  selectedDevice: "MOBILE" | "DESKTOP";
  onChange: (device: "MOBILE" | "DESKTOP") => void;
  mobileScore: number | null;
  desktopScore: number | null;
  auditId?: string;
}

function getBadgeStyle(score: number | null) {
  const band = getScoreBand(score);
  if (band === "good") return "bg-emerald-100 text-emerald-800";
  if (band === "needs-improvement") return "bg-amber-100 text-amber-900";
  if (band === "poor") return "bg-red-100 text-red-800";
  return "bg-slate-200 text-slate-700";
}

export function DeviceSwitcher({
  selectedDevice,
  onChange,
  mobileScore,
  desktopScore,
  auditId,
}: DeviceSwitcherProps) {
  function handleSelect(device: "MOBILE" | "DESKTOP") {
    if (device === selectedDevice) return;
    trackAnalyticsEvent("device_tab_changed", {
      device_category: device === "MOBILE" ? "mobile" : "desktop",
      audit_id: auditId,
    });
    onChange(device);
  }

  return (
    <div
      role="tablist"
      aria-label="Select device view"
      className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1"
    >
      <button
        type="button"
        role="tab"
        aria-selected={selectedDevice === "MOBILE"}
        onClick={() => handleSelect("MOBILE")}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
          selectedDevice === "MOBILE"
            ? "bg-white text-slate-950 shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <Smartphone className="h-4 w-4" aria-hidden="true" />
        <span>Mobile</span>
        <span
          className={`rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${getBadgeStyle(
            mobileScore
          )}`}
        >
          {mobileScore !== null ? mobileScore : "—"}
        </span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={selectedDevice === "DESKTOP"}
        onClick={() => handleSelect("DESKTOP")}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
          selectedDevice === "DESKTOP"
            ? "bg-white text-slate-950 shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <Monitor className="h-4 w-4" aria-hidden="true" />
        <span>Desktop</span>
        <span
          className={`rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${getBadgeStyle(
            desktopScore
          )}`}
        >
          {desktopScore !== null ? desktopScore : "—"}
        </span>
      </button>
    </div>
  );
}
