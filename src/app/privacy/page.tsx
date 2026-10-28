import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Barking Otter handles website performance reports, contact requests, and analytics data.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-bold text-slate-950">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: October 2026
        </p>

        <div className="mt-8 space-y-6 text-sm sm:text-base text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-950">
              1. Information We Collect
            </h2>
            <p>
              When you submit a public website URL to the Barking Otter Website
              Performance Analyzer, we process the normalized URL to retrieve
              publicly accessible performance measurements from the Google
              PageSpeed Insights API and the Chrome UX Report (CrUX) API. We
              strip common marketing and sensitive query parameters before
              storing the tested URL.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-950">
              2. Report Storage &amp; Sharing
            </h2>
            <p>
              Generated performance reports are assigned a unique, unguessable
              report identifier so you can bookmark or share your results with
              colleagues without creating an account. Publicly shareable reports
              contain only website performance metrics and diagnostics—they
              never expose lead contact details or internal notes. Reports are
              retained according to our configurable retention policy (90 days
              by default).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-950">
              3. Contact &amp; Optimization Plan Requests
            </h2>
            <p>
              When you request an optimization plan, consultation, or emailed
              report link, we collect the contact information you provide (such
              as your name, business email, company name, and notes). We use
              this information solely to deliver your requested report or follow
              up regarding Barking Otter optimization services. We never
              automatically enroll you in marketing mailing lists unless you
              explicitly opt in.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-950">
              4. Analytics &amp; Abuse Prevention
            </h2>
            <p>
              We use privacy-conscious analytics events to understand aggregate
              tool usage (such as device tab switches and score bands) without
              sending personal names, email addresses, or sensitive tokens to
              Google Analytics. Client IP addresses are hashed with a cryptographic
              salt for rate limiting and abuse prevention.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
