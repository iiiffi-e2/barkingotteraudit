import React from "react";
import { verifyAdminRequest, getAdminAllowlist } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminLoginGate } from "@/components/admin/AdminLoginGate";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await verifyAdminRequest();

  if (!auth.authenticated || !auth.email) {
    const allowlistHint = getAdminAllowlist()[0] || "admin@barkingotter.com";
    return <AdminLoginGate allowedHint={allowlistHint} />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fcfcfb]">
      <AdminSidebar adminEmail={auth.email} />
      <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
