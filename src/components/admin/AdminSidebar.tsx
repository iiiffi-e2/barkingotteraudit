"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Gauge,
  LayoutDashboard,
  History,
  Users,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";

interface AdminSidebarProps {
  adminEmail: string;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/audits", label: "Historical Audits", icon: History },
  { href: "/admin/leads", label: "Captured Leads", icon: Users },
  { href: "/admin/settings", label: "Tool Settings", icon: Settings },
];

export function AdminSidebar({ adminEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.refresh();
  }

  return (
    <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
      <div className="flex flex-col h-full justify-between p-4 sm:p-6">
        <div>
          <div className="flex items-center justify-between lg:justify-start gap-2.5 pb-6 border-b border-slate-100">
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-amber-400">
                <Gauge className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <span className="block text-sm font-bold text-slate-950 leading-none">
                  Barking Otter
                </span>
                <span className="block text-[11px] font-medium text-slate-500 mt-1">
                  Admin Console
                </span>
              </div>
            </Link>

            <Link
              href="/speed-test"
              className="lg:hidden inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <span>Public Tool</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <nav
            aria-label="Admin Navigation"
            className="mt-4 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-amber-400" : "text-slate-400"
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block pt-6 border-t border-slate-100 space-y-3">
          <div className="px-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Signed in as
            </p>
            <p className="truncate text-xs font-semibold text-slate-800 mt-0.5">
              {adminEmail}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <Link
              href="/speed-test"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Open Public Analyzer</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer text-left"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
