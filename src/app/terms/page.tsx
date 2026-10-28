import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing the use of the Barking Otter Website Performance Analyzer.",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-bold text-slate-950">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: October 2026
        </p>

        <div className="mt-8 space-y-6 text-sm sm:text-base text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-950">
              1. Acceptable Use
            </h2>
            <p>
              The Barking Otter Website Performance Analyzer is provided to test
              publicly accessible HTTP/HTTPS web pages. You may not use this
              service to probe private networks, internal infrastructure, or
              websites where you are prohibited from initiating automated speed
              checks. Automated scraping or circumventing rate limits is
              prohibited.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-950">
              2. Measurement Disclaimers
            </h2>
            <p>
              Performance scores and diagnostics are based on Google Lighthouse
              laboratory tests and Chrome UX Report field data at the time of
              testing. Single-run laboratory metrics can vary based on network
              routing, server load, and third-party script behavior. Preliminary
              optimization assessments and estimated savings are informational
              and do not constitute a guarantee of specific post-optimization
              scores or revenue outcomes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-950">
              3. Paid Optimization Services
            </h2>
            <p>
              While the online performance assessment is free, done-for-you
              optimization engineering services provided by Barking Otter are
              commercial engagements governed by a separate service agreement
              after reviewing your website&apos;s architecture and access
              requirements.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
