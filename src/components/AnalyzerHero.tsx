import { Gauge, SearchCheck, Wrench, Smartphone, Monitor, ShieldCheck } from "lucide-react";
import { UrlInput } from "@/components/UrlInput";

interface AnalyzerHeroProps {
  headline?: string;
  subheadline?: string;
  source?: "PUBLIC_WEB" | "HOMEPAGE_WIDGET";
}

export function AnalyzerHero({
  headline = "How Fast Is Your Website?",
  subheadline = "Find out what's slowing your website down, what it means for your visitors, and how to make it faster.",
  source = "PUBLIC_WEB",
}: AnalyzerHeroProps) {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs mb-6">
          <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
          <span>Independent Speed &amp; Core Web Vitals Assessment</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl leading-[1.08]">
          {headline}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg sm:text-xl text-slate-600 leading-relaxed">
          {subheadline}
        </p>

        <div className="mx-auto mt-9 max-w-2xl">
          <UrlInput source={source} />
        </div>

        {/* Three Concise Benefit Statements */}
        <div className="mt-16 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
              <Gauge className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900">
              See Your Score
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Get an independent assessment of your website&apos;s speed across
              mobile and desktop devices.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
              <SearchCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Discover What&apos;s Slowing You Down
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Understand the biggest performance problems without technical
              jargon.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
              <Wrench className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Know What to Fix
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              See which improvements deserve attention and how Barking Otter can
              help.
            </p>
          </div>
        </div>

        {/* Concise Explanation of What Is Being Tested */}
        <div className="mt-10 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-6 py-5 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                What happens during your analysis?
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                We run live Google Lighthouse laboratory tests for both mobile
                and desktop alongside 28-day Chrome UX Report (CrUX) real-visitor
                field data, then translate the technical diagnostics into a clear
                action plan.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs font-medium text-slate-700">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 border border-slate-200">
                <Smartphone className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Mobile Lab
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 border border-slate-200">
                <Monitor className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Desktop Lab
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 border border-slate-200">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                CrUX Field Vitals
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
