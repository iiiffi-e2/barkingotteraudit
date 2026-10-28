import Link from "next/link";
import { Gauge, ArrowUpRight, ShieldCheck } from "lucide-react";

interface SiteHeaderProps {
  variant?: "default" | "compact";
}

export function SiteHeader({ variant = "default" }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-[#fcfcfb]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900 rounded-md"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-amber-400 shadow-xs transition-transform group-hover:scale-105">
              <Gauge className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight leading-none text-slate-900">
                Barking Otter
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-0.5">
                Speed &amp; Performance Engineering
              </span>
            </div>
          </Link>

          {variant === "default" && (
            <nav
              aria-label="Primary Navigation"
              className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
            >
              <Link
                href="/speed-test"
                className="hover:text-slate-900 transition-colors"
              >
                Speed Analyzer
              </Link>
              <Link
                href="/#how-it-works"
                className="hover:text-slate-900 transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="/#services"
                className="hover:text-slate-900 transition-colors"
              >
                Optimization Services
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200/70">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            Lighthouse + CrUX Verified
          </span>
          <Link
            href="/speed-test"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 transition-colors"
          >
            <span>Analyze a Site</span>
            <ArrowUpRight className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
