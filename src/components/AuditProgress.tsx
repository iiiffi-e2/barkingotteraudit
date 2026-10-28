"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Copy, Check, Globe } from "lucide-react";
import { AuditStatus } from "@/components/AuditStatus";

interface AuditProgressProps {
  auditId: string;
  hostname: string;
  normalizedUrl: string;
  currentStatus: string;
  startedAt?: string | null;
}

export function AuditProgress({
  auditId,
  hostname,
  normalizedUrl,
  currentStatus,
}: AuditProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function handleCopyBookmark() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-2xl px-4 py-12 sm:py-16"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
              <Globe className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Analyzing Website
              </p>
              <h1 className="text-lg font-bold text-slate-950 break-all">
                {hostname}
              </h1>
            </div>
          </div>

          <Link
            href="/speed-test"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Return to Analyzer</span>
          </Link>
        </div>

        <div className="mt-6">
          <h2 className="text-base font-semibold text-slate-900">
            We&apos;re checking how your website performs on mobile and desktop.
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Testing <span className="font-medium text-slate-800">{normalizedUrl}</span>{" "}
            against Google Lighthouse and Chrome UX Report data.
          </p>
        </div>

        <div className="mt-6">
          <AuditStatus currentStatus={currentStatus} />
        </div>

        {elapsedSeconds >= 15 && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                Still working—detailed performance tests can take a moment.
              </p>
              <p className="mt-0.5 text-amber-800">
                Heavy pages or slower server responses take extra time for
                Lighthouse to measure accurately. You can stay on this screen or
                copy the link below and return at any time.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <span>
            Your report runs in the background—you can safely bookmark this URL
            and return anytime.
          </span>
          <button
            type="button"
            onClick={handleCopyBookmark}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>Copy Report URL ({auditId.slice(0, 8)})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
