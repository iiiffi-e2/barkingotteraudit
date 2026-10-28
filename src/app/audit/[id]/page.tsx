import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPublicAuditReportById } from "@/lib/audit-runner";
import { AuditReportView } from "@/components/AuditReportView";

export const dynamic = "force-dynamic";

export async function generateMetadata(context: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await context.params;
  const report = await getPublicAuditReportById(id);
  if (!report) {
    return {
      title: "Report Not Found",
    };
  }
  return {
    title: `Performance Report for ${report.hostname}`,
    description: `Website speed and Core Web Vitals assessment for ${report.normalizedUrl} by Barking Otter.`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function AuditReportPage(context: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await context.params;
  const report = await getPublicAuditReportById(id);

  if (!report) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <AuditReportView initialReport={report} />
      </main>
      <SiteFooter />
    </>
  );
}
