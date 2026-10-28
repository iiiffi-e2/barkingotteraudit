"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
  Clock,
  Globe,
} from "lucide-react";

interface AuditErrorStateProps {
  auditId: string;
  normalizedUrl: string;
  hostname: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  isExpired?: boolean;
}

export function AuditErrorState({
  auditId,
  normalizedUrl,
  hostname,
  errorCode,
  errorMessage,
  isExpired = false,
}: AuditErrorStateProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function handleRerun(allowHttp = false) {
    setIsRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch(`/api/audits/${auditId}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowHttp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRetryError(
          data?.error?.message || "Could not start a rerun right now."
        );
        setIsRetrying(false);
        return;
      }
      router.push(`/audit/${data.id}`);
    } catch {
      setRetryError("Network error while requesting a rerun.");
      setIsRetrying(false);
    }
  }

  const isHttps = normalizedUrl.startsWith("https://");
  const isUnreachable =
    errorCode === "SITE_UNREACHABLE" || errorCode === "TIMEOUT";
  const isBlocked = errorCode === "BLOCKED_BY_SITE";
  const isRateLimited = errorCode === "RATE_LIMITED";

  let title = "We Couldn't Complete This Website Analysis";
  let explanation =
    errorMessage ||
    "Something interrupted the performance test before Lighthouse could finish measuring the page.";

  if (isExpired) {
    title = "This Performance Report Has Expired";
    explanation =
      "Stored reports are retained for a limited period. You can run a fresh analysis of this website in one click below.";
  } else if (isBlocked) {
    title = "This Website Blocked Automated Performance Testing";
    explanation = `${hostname} appears to use a firewall or bot-protection challenge that prevented Google Lighthouse from loading the page.`;
  } else if (isRateLimited) {
    title = "Testing Quota Temporarily Reached";
    explanation =
      "The Google PageSpeed API rate limit was reached. Please wait a moment and try running your test again.";
  } else if (isUnreachable) {
    title = `We Couldn't Reach ${hostname}`;
    explanation =
      errorMessage ||
      "Please verify that the website address is spelled correctly, online, and publicly accessible without a login.";
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-700">
          {isBlocked ? (
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          ) : isExpired ? (
            <Clock className="h-6 w-6" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          )}
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
          {explanation}
        </p>

        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="truncate">Tested address: {normalizedUrl}</span>
        </div>

        {retryError && (
          <p role="alert" className="mt-4 text-sm font-medium text-red-600">
            {retryError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isRetrying}
            onClick={() => handleRerun(false)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>{isExpired ? "Run Fresh Analysis" : "Retry Analysis"}</span>
          </button>

          {isUnreachable && isHttps && (
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => handleRerun(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
            >
              <span>Retry Over HTTP (Non-HTTPS Site)</span>
            </button>
          )}

          <Link
            href="/speed-test"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Try Another Website</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
