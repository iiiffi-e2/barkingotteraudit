"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Share2,
  Download,
  RefreshCw,
  Mail,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface ReportActionsProps {
  auditId: string;
  hostname: string;
}

export function ReportActions({ auditId, hostname }: ReportActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);

  function handleCopyLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      trackAnalyticsEvent("report_shared", {
        audit_id: auditId,
        hostname,
      });
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function handleDownloadPdf() {
    trackAnalyticsEvent("report_downloaded", {
      audit_id: auditId,
      hostname,
    });
    window.open(`/api/audits/${auditId}/pdf`, "_blank", "noopener,noreferrer");
  }

  async function handleRerun() {
    setIsRerunning(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/audit/${data.id}`);
        router.refresh();
      }
    } finally {
      setIsRerunning(false);
    }
  }

  async function handleSendEmailReport(e: React.FormEvent) {
    e.preventDefault();
    setEmailStatus("sending");
    setEmailFeedback(null);

    try {
      const res = await fetch("/api/reports/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId,
          email: emailAddress.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailStatus("error");
        setEmailFeedback(
          data?.error?.message || "Could not send report link email."
        );
        return;
      }

      trackAnalyticsEvent("email_report_requested", {
        audit_id: auditId,
        hostname,
      });
      setEmailStatus("sent");
      setEmailFeedback(
        data.message || "Report link sent! Check your inbox shortly."
      );
    } catch {
      setEmailStatus("error");
      setEmailFeedback("Network error while sending the report email.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-950 transition-colors cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span>Link Copied</span>
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <span>Copy Report Link</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleDownloadPdf}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-950 transition-colors cursor-pointer"
      >
        <Download className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <span>Download PDF</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setShowEmailModal((prev) => !prev);
          setEmailStatus("idle");
          setEmailFeedback(null);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-950 transition-colors cursor-pointer"
      >
        <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <span>Email Report</span>
      </button>

      <button
        type="button"
        disabled={isRerunning}
        onClick={handleRerun}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-950 disabled:opacity-60 transition-colors cursor-pointer"
      >
        <RefreshCw
          className={`h-4 w-4 text-slate-500 ${
            isRerunning ? "animate-spin" : ""
          }`}
          aria-hidden="true"
        />
        <span>{isRerunning ? "Starting..." : "Rerun Test"}</span>
      </button>

      {showEmailModal && (
        <div className="w-full mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Email a Link to This Report
            </h3>
            <button
              type="button"
              onClick={() => setShowEmailModal(false)}
              aria-label="Close email report panel"
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Receive a direct link to this report in your inbox. We will not
            enroll your email in any marketing list.
          </p>

          <form
            onSubmit={handleSendEmailReport}
            className="mt-3 flex flex-col sm:flex-row gap-2"
          >
            <label htmlFor="email-report-input" className="sr-only">
              Email address for report link
            </label>
            <input
              id="email-report-input"
              type="email"
              required
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="you@company.com"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
            <button
              type="submit"
              disabled={emailStatus === "sending"}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              {emailStatus === "sending" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send Report Link</span>
              )}
            </button>
          </form>

          {emailFeedback && (
            <p
              role="status"
              className={`mt-2 text-xs font-medium ${
                emailStatus === "error" ? "text-red-600" : "text-emerald-700"
              }`}
            >
              {emailFeedback}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
