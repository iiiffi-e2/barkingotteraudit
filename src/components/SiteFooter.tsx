import Link from "next/link";
import { Gauge } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-amber-400">
                <Gauge className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-base font-semibold tracking-tight text-slate-900">
                Barking Otter
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm text-slate-600 leading-relaxed">
              Done-for-you website speed and performance optimization. Real
              performance data, clear plain-English recommendations, and expert
              implementation without technical headaches.
            </p>
            <p className="mt-4 text-xs text-slate-500">
              Real performance data. Clear recommendations. No technical headaches.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Performance Tool
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
              <li>
                <Link href="/speed-test" className="hover:text-slate-900">
                  Website Speed Test
                </Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-slate-900">
                  Done-For-You Optimization
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-slate-900">
                  What We Measure
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Company &amp; Legal
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
              <li>
                <Link href="/privacy" className="hover:text-slate-900">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-slate-900">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-slate-900">
                  Internal Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Barking Otter. All rights reserved.</p>
          <p>
            Powered by Google Lighthouse &amp; Chrome UX Report (CrUX) field data.
          </p>
        </div>
      </div>
    </footer>
  );
}
