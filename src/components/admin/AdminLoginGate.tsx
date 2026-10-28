"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, AlertCircle, Loader2 } from "lucide-react";

interface AdminLoginGateProps {
  allowedHint?: string;
}

export function AdminLoginGate({ allowedHint }: AdminLoginGateProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          accessToken: accessToken.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data?.error?.message || "Unauthorized administrator credentials."
        );
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error while signing in.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfb] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-950">
              Barking Otter Admin Console
            </h1>
            <p className="text-xs text-slate-500">
              Authorized team allowlist authentication
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="admin-email-input"
              className="block text-xs font-semibold text-slate-800"
            >
              Authorized Admin Email
            </label>
            <input
              id="admin-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@barkingotter.com"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="admin-token-input"
              className="block text-xs font-semibold text-slate-800"
            >
              Admin Access Token{" "}
              <span className="text-slate-400 font-normal">(optional in dev)</span>
            </label>
            <input
              id="admin-token-input"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="••••••••••••"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" aria-hidden="true" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <span>Sign In to Admin Dashboard</span>
              </>
            )}
          </button>

          {allowedHint && (
            <p className="text-[11px] text-slate-500 text-center pt-1">
              Configured allowlist includes: <code className="font-mono">{allowedHint}</code>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
