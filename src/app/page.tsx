import React from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { UrlInput } from "@/components/UrlInput";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import {
  Gauge,
  CheckCircle2,
  Wrench,
  FileSpreadsheet,
  ArrowRight,
  Zap,
  Layers,
  ShieldCheck,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero with Reusable URL Submission Widget */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200/70">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs mb-6">
              <span
                className="h-2 w-2 rounded-full bg-amber-500"
                aria-hidden="true"
              />
              <span>Done-For-You Website Speed &amp; Performance Optimization</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl leading-[1.08]">
              Your website could be faster. Let&apos;s find out what&apos;s
              slowing it down.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg sm:text-xl text-slate-600 leading-relaxed">
              Find out how your website performs, what&apos;s holding it back,
              and what we can do to make it better. No technical knowledge
              required.
            </p>

            <div className="mx-auto mt-9 max-w-2xl">
              <UrlInput source="HOMEPAGE_WIDGET" />
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2
                  className="h-4 w-4 text-emerald-600"
                  aria-hidden="true"
                />
                <span>Real Google Lighthouse &amp; CrUX Data</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2
                  className="h-4 w-4 text-emerald-600"
                  aria-hidden="true"
                />
                <span>Plain-English Priorities</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2
                  className="h-4 w-4 text-emerald-600"
                  aria-hidden="true"
                />
                <span>Done-For-You Engineering</span>
              </span>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="py-16 sm:py-24 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Clarity. Credibility. Conversion.
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-950">
              A performance report written for business owners—backed by
              engineering evidence.
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              Most speed tools dump dozens of raw developer diagnostics onto
              your screen. Barking Otter measures your site with trusted Google
              tools and explains what actually matters.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
                <Gauge className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-950">
                1. Test Mobile &amp; Desktop Separately
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                We run independent Google Lighthouse checks for mobile and
                desktop alongside 28-day Chrome UX Report field data from real
                visitors.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
                <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-950">
                2. Understand What&apos;s Holding You Back
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Every finding is translated into clear language with evidence-based
                priority labels—plus expandable technical details for your
                developers.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
                <Wrench className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-950">
                3. Have Barking Otter Fix It
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                When you&apos;re ready, our engineers handle image compression,
                caching, script deferral, font loading, and Core Web Vitals
                improvements for you.
              </p>
            </div>
          </div>
        </section>

        {/* Services & Platform Agnostic Section */}
        <section
          id="services"
          className="border-t border-slate-200/80 bg-white py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Done-For-You Optimization Services
                </span>
                <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-950">
                  Expert speed optimization across modern web platforms.
                </h2>
                <p className="mt-3 text-base text-slate-600 leading-relaxed">
                  Whether your site runs on WordPress, Shopify, Webflow,
                  Squarespace, Wix, Next.js, React, Astro, or a custom codebase,
                  we tailor improvements to your actual architecture.
                </p>
              </div>
              <Link
                href="/speed-test"
                className="inline-flex items-center gap-2 self-start rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <span>Run a Free Speed Test First</span>
                <ArrowRight className="h-4 w-4 text-amber-400" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-6">
                <Zap className="h-6 w-6 text-amber-600" aria-hidden="true" />
                <h3 className="mt-3 text-base font-bold text-slate-950">
                  Asset &amp; Media Delivery
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">
                  Next-gen WebP/AVIF encoding, responsive sizing, hero LCP
                  prioritization, and below-the-fold lazy loading.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6">
                <Layers className="h-6 w-6 text-amber-600" aria-hidden="true" />
                <h3 className="mt-3 text-base font-bold text-slate-950">
                  JavaScript &amp; Stylesheet Diet
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">
                  Render-blocking stylesheet deferral, unused script pruning,
                  and third-party tag manager cleanup.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6">
                <ShieldCheck
                  className="h-6 w-6 text-amber-600"
                  aria-hidden="true"
                />
                <h3 className="mt-3 text-base font-bold text-slate-950">
                  Caching &amp; Visual Stability
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">
                  Edge and browser caching headers, font-display optimization,
                  and layout shift (CLS) elimination.
                </p>
              </div>
            </div>

            <LeadCaptureForm
              defaultWebsiteUrl=""
              selectedSource="HOMEPAGE_CONSULTATION"
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
