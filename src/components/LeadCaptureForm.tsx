"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface LeadCaptureFormProps {
  auditId?: string;
  defaultWebsiteUrl: string;
  selectedSource?: string;
}

export function LeadCaptureForm({
  auditId,
  defaultWebsiteUrl,
  selectedSource = "OPTIMIZATION_PLAN",
}: LeadCaptureFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState(defaultWebsiteUrl);
  const [goalOrConcern, setGoalOrConcern] = useState("");
  const [message, setMessage] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedState, setSubmittedState] = useState<{
    headline: string;
    message: string;
  } | null>(null);

  function handleFieldFocus() {
    if (!hasStarted) {
      setHasStarted(true);
      trackAnalyticsEvent("lead_form_started", {
        audit_id: auditId,
        conversion_source: selectedSource,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (name.trim().length < 2) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!email.trim().includes("@") || !email.trim().includes(".")) {
      setErrorMessage("Please enter a valid business email address.");
      return;
    }
    if (!websiteUrl.trim()) {
      setErrorMessage("Please confirm your website URL.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId: auditId || null,
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || null,
          websiteUrl: websiteUrl.trim(),
          goalOrConcern: goalOrConcern.trim() || null,
          message: message.trim() || null,
          source: selectedSource,
          marketingConsent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(
          data?.error?.message ||
            "Please check your details and try submitting again."
        );
        setIsSubmitting(false);
        return;
      }

      trackAnalyticsEvent("lead_submitted", {
        audit_id: auditId,
        conversion_source: selectedSource,
      });

      setSubmittedState({
        headline: data.confirmationHeadline || "Your Request Is In.",
        message:
          data.confirmationMessage ||
          "We've received your website assessment and request. We'll review the findings and follow up with recommendations.",
      });
      setIsSubmitting(false);
    } catch {
      setErrorMessage(
        "A network error occurred. Please check your connection and try again."
      );
      setIsSubmitting(false);
    }
  }

  if (submittedState) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="lead-confirmation-box"
        className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8 text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-2xl font-bold text-slate-950">
          {submittedState.headline}
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-sm sm:text-base text-slate-700 leading-relaxed">
          {submittedState.message}
        </p>
        {auditId && (
          <div className="mt-6">
            <a
              href={`#report-top`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <span>Return to Your Performance Report</span>
              <ArrowUpRight className="h-4 w-4 text-amber-400" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      id="optimization-plan-form"
      className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xs"
    >
      <div className="max-w-2xl">
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-amber-700">
          Done-For-You Performance Optimization
        </span>
        <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-950">
          Have Barking Otter Fix It
        </h2>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
          Share your contact details below and our engineering team will review
          your audit report, evaluate your website&apos;s architecture, and send
          over a clear optimization plan.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="lead-name"
              className="block text-xs font-semibold text-slate-800"
            >
              Your Name <span className="text-red-600">*</span>
            </label>
            <input
              id="lead-name"
              type="text"
              required
              value={name}
              onFocus={handleFieldFocus}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label
              htmlFor="lead-email"
              className="block text-xs font-semibold text-slate-800"
            >
              Business Email <span className="text-red-600">*</span>
            </label>
            <input
              id="lead-email"
              type="email"
              required
              value={email}
              onFocus={handleFieldFocus}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="lead-company"
              className="block text-xs font-semibold text-slate-800"
            >
              Company Name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="lead-company"
              type="text"
              value={company}
              onFocus={handleFieldFocus}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Rivera Goods Co."
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label
              htmlFor="lead-website"
              className="block text-xs font-semibold text-slate-800"
            >
              Website URL <span className="text-red-600">*</span>
            </label>
            <input
              id="lead-website"
              type="url"
              required
              value={websiteUrl}
              onFocus={handleFieldFocus}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="lead-goal"
            className="block text-xs font-semibold text-slate-800"
          >
            Main Goal or Concern{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <select
            id="lead-goal"
            value={goalOrConcern}
            onFocus={handleFieldFocus}
            onChange={(e) => setGoalOrConcern(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">Select your primary priority...</option>
            <option value="Improve mobile speed and Core Web Vitals">
              Improve mobile speed and Core Web Vitals
            </option>
            <option value="Speed up landing pages for paid ad campaigns">
              Speed up landing pages for paid ad campaigns
            </option>
            <option value="Fix slow WordPress / Shopify / CMS performance">
              Fix slow WordPress / Shopify / CMS performance
            </option>
            <option value="Full technical optimization plan & quote">
              Full technical optimization plan &amp; quote
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="lead-notes"
            className="block text-xs font-semibold text-slate-800"
          >
            Additional Notes{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="lead-notes"
            rows={3}
            value={message}
            onFocus={handleFieldFocus}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Any context about your platform, recent redesigns, or specific slow pages..."
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <div className="flex items-start gap-2.5 pt-1">
          <input
            id="lead-marketing-consent"
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <label
            htmlFor="lead-marketing-consent"
            className="text-xs text-slate-600 leading-relaxed"
          >
            Optional: Send me occasional web performance guides from Barking
            Otter. (Leave unchecked to receive only our direct response to this
            request.)
          </label>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" aria-hidden="true" />
                <span>Sending Request...</span>
              </>
            ) : (
              <span>Request My Optimization Plan</span>
            )}
          </button>

          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>
              Your details remain private. Read our{" "}
              <Link href="/privacy" className="underline hover:text-slate-800">
                Privacy Policy
              </Link>
              .
            </span>
          </p>
        </div>
      </form>
    </div>
  );
}
