import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <SearchX className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-950">
            Page or Report Not Found
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            We couldn&apos;t find the page or performance report you were
            looking for. You can start a fresh website analysis below.
          </p>
          <div className="mt-6">
            <Link
              href="/speed-test"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span>Go to Website Speed Analyzer</span>
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
