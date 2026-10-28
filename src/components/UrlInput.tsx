"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe, AlertCircle, Loader2 } from "lucide-react";
import { validateAndNormalizeUrl } from "@/lib/url-validation";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface UrlInputProps {
  source?: "PUBLIC_WEB" | "HOMEPAGE_WIDGET";
  initialValue?: string;
  compact?: boolean;
}

export function UrlInput({
  source = "PUBLIC_WEB",
  initialValue = "",
  compact = false,
}: UrlInputProps) {
  const router = useRouter();
  const [url, setUrl] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validateAndNormalizeUrl(url);
    if (!validation.valid || !validation.normalizedUrl) {
      setErrorMessage(
        validation.errorMessage ||
          "Please enter a valid website address (for example, example.com)."
      );
      return;
    }

    setIsSubmitting(true);
    trackAnalyticsEvent("audit_started", {
      conversion_source: source,
      hostname: validation.hostname,
    });

    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          source,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(
          data?.error?.message ||
            "We couldn't start your analysis right now. Please check the URL and try again."
        );
        setIsSubmitting(false);
        return;
      }

      if (data.cached) {
        trackAnalyticsEvent("audit_cached", {
          audit_id: data.id,
          hostname: data.hostname,
        });
      }

      router.push(`/audit/${data.id}`);
    } catch {
      setErrorMessage(
        "A network error occurred while submitting your request. Please try again."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Website Performance Analyzer Form"
        className="w-full"
      >
        <div
          className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl bg-white p-2 transition-all duration-200 border ${
            errorMessage
              ? "border-red-400 ring-4 ring-red-100"
              : isFocused
              ? "border-slate-900 ring-4 ring-slate-900/10 shadow-lg"
              : "border-slate-300 shadow-md hover:border-slate-400"
          }`}
        >
          <div className="relative flex flex-1 items-center pl-3 pr-2 py-2 sm:py-1.5">
            <Globe
              className={`h-5 w-5 shrink-0 transition-colors ${
                errorMessage
                  ? "text-red-500"
                  : isFocused
                  ? "text-slate-900"
                  : "text-slate-400"
              }`}
              aria-hidden="true"
            />
            <label htmlFor={`url-input-${source}`} className="sr-only">
              Website URL to analyze
            </label>
            <input
              id={`url-input-${source}`}
              type="text"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={url}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isSubmitting}
              placeholder="https://yourwebsite.com"
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={
                errorMessage ? `url-error-${source}` : `url-helper-${source}`
              }
              className={`w-full bg-transparent pl-3 text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                compact ? "text-base py-1" : "text-base sm:text-lg py-1.5"
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 font-semibold text-white shadow-xs transition-all hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
              compact
                ? "px-5 py-3 text-sm sm:text-base"
                : "px-6 py-3.5 sm:py-4 text-base"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-amber-400" aria-hidden="true" />
                <span>Starting Analysis...</span>
              </>
            ) : (
              <>
                <span>Analyze My Website</span>
                <ArrowRight className="h-4 w-4 text-amber-400" aria-hidden="true" />
              </>
            )}
          </button>
        </div>

        {errorMessage && (
          <div
            id={`url-error-${source}`}
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-left text-sm text-red-800"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
              aria-hidden="true"
            />
            <span>{errorMessage}</span>
          </div>
        )}

        <div
          id={`url-helper-${source}`}
          className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs sm:text-sm text-slate-500"
        >
          <span>Free performance analysis. No signup required.</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Try an example:</span>
            {[
              { label: "slow-bakery.example", url: "https://slow-bakery.example" },
              { label: "shop-store.example", url: "https://shop-store.example" },
              { label: "fast-saas.example", url: "https://fast-saas.example" },
            ].map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setUrl(sample.url);
                  setErrorMessage(null);
                }}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
