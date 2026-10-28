import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createOrReuseCachedAudit,
  executeAuditPipeline,
  getPublicAuditReportById,
} from "@/lib/audit-runner";
import { prisma } from "@/lib/db";
import { generateBrandedPdfBuffer } from "@/lib/pdf-report";
import { sendLeadConfirmationAndInternalAlert } from "@/lib/email";

describe("Integration Tests: Audit Pipeline, API Error Recovery, Caching & Lead Persistence", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("completes a full mobile + desktop audit, persists opportunities & CrUX, and generates a PDF report", async () => {
    const testUrl = `https://slow-bakery-${Date.now()}.example`;
    const { auditId, cached } = await createOrReuseCachedAudit({
      requestedUrl: testUrl,
      normalizedUrl: testUrl,
      hostname: new URL(testUrl).hostname,
      source: "PUBLIC_WEB",
      forceRerun: true,
    });

    expect(cached).toBe(false);
    await executeAuditPipeline(auditId);

    const report = await getPublicAuditReportById(auditId);
    expect(report).not.toBeNull();
    expect(report?.status).toBe("COMPLETED");
    expect(report?.runs.MOBILE?.performanceScore).toBeGreaterThanOrEqual(20);
    expect(report?.runs.DESKTOP?.performanceScore).toBeGreaterThan(
      report?.runs.MOBILE?.performanceScore ?? 0
    );
    expect(report?.runs.MOBILE?.opportunities.length).toBeGreaterThan(0);
    expect(report?.detectedPlatform).toBe("WordPress");
    expect(report?.aiAnalysis?.output.summary).toBeTruthy();

    // Verify 24h cache reuse when forceRerun is false
    const secondCall = await createOrReuseCachedAudit({
      requestedUrl: testUrl,
      normalizedUrl: testUrl,
      hostname: new URL(testUrl).hostname,
      source: "PUBLIC_WEB",
      forceRerun: false,
    });
    expect(secondCall.auditId).toBe(auditId);
    expect(secondCall.cached).toBe(true);

    // Verify PDF generation from stored audit results
    const pdfBuffer = generateBrandedPdfBuffer(report!);
    expect(pdfBuffer.byteLength).toBeGreaterThan(1500);
    expect(pdfBuffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("retains partial results when mobile succeeds and desktop times out", async () => {
    const partialUrl = `https://desktop-fails-${Date.now()}.example`;
    const { auditId } = await createOrReuseCachedAudit({
      requestedUrl: partialUrl,
      normalizedUrl: partialUrl,
      hostname: new URL(partialUrl).hostname,
      source: "PUBLIC_WEB",
      forceRerun: true,
    });

    await executeAuditPipeline(auditId);

    const report = await getPublicAuditReportById(auditId);
    expect(report?.status).toBe("PARTIAL");
    expect(report?.runs.MOBILE?.status).toBe("COMPLETED");
    expect(report?.runs.MOBILE?.performanceScore).not.toBeNull();
    expect(report?.runs.DESKTOP?.status).toBe("FAILED");
    expect(report?.runs.DESKTOP?.performanceScore).toBeNull();
  });

  it("handles unreachable sites cleanly without fabricating scores", async () => {
    const unreachableUrl = `https://unreachable-site-${Date.now()}.example`;
    const { auditId } = await createOrReuseCachedAudit({
      requestedUrl: unreachableUrl,
      normalizedUrl: unreachableUrl,
      hostname: new URL(unreachableUrl).hostname,
      source: "PUBLIC_WEB",
      forceRerun: true,
    });

    await executeAuditPipeline(auditId);

    const report = await getPublicAuditReportById(auditId);
    expect(report?.status).toBe("FAILED");
    expect(report?.errorCode).toBe("SITE_UNREACHABLE");
    expect(report?.runs.MOBILE?.performanceScore).toBeNull();
    expect(report?.runs.DESKTOP?.performanceScore).toBeNull();
  });

  it("handles sites without CrUX field data and sites with origin-level CrUX fallback", async () => {
    const noCruxUrl = `https://no-crux-site-${Date.now()}.example`;
    const { auditId: noCruxId } = await createOrReuseCachedAudit({
      requestedUrl: noCruxUrl,
      normalizedUrl: noCruxUrl,
      hostname: new URL(noCruxUrl).hostname,
      forceRerun: true,
    });
    await executeAuditPipeline(noCruxId);
    const noCruxReport = await getPublicAuditReportById(noCruxId);
    expect(noCruxReport?.crux.MOBILE?.dataScope).toBe("UNAVAILABLE");
    expect(noCruxReport?.crux.MOBILE?.overallStatus).toBe("UNAVAILABLE");

    const originCruxUrl = `https://origin-crux-site-${Date.now()}.example/services`;
    const { auditId: originCruxId } = await createOrReuseCachedAudit({
      requestedUrl: originCruxUrl,
      normalizedUrl: originCruxUrl,
      hostname: new URL(originCruxUrl).hostname,
      forceRerun: true,
    });
    await executeAuditPipeline(originCruxId);
    const originCruxReport = await getPublicAuditReportById(originCruxId);
    expect(originCruxReport?.crux.MOBILE?.dataScope).toBe("ORIGIN");
  });

  it("persists lead submissions associated with an audit and delivers confirmation emails without exposing PII on public report", async () => {
    const url = `https://fast-saas-${Date.now()}.example`;
    const { auditId } = await createOrReuseCachedAudit({
      requestedUrl: url,
      normalizedUrl: url,
      hostname: new URL(url).hostname,
      forceRerun: true,
    });
    await executeAuditPipeline(auditId);

    const lead = await prisma.lead.create({
      data: {
        auditId,
        name: "Taylor Founder",
        email: "taylor@fast-saas.example",
        company: "Fast SaaS Inc",
        websiteUrl: url,
        goalOrConcern: "Keep Core Web Vitals green",
        message: "Looking for ongoing monitoring.",
        internalNotes: "CONFIDENTIAL_INTERNAL_NOTE_DO_NOT_LEAK",
        source: "OPTIMIZATION_PLAN",
        marketingConsent: false,
      },
    });

    const emailRes = await sendLeadConfirmationAndInternalAlert({
      leadId: lead.id,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      websiteUrl: lead.websiteUrl,
      goalOrConcern: lead.goalOrConcern,
      message: lead.message,
      auditId,
      source: lead.source,
      notificationRecipients: "team@barkingotter.com",
    });

    expect(emailRes.prospectEmail.delivered).toBe(true);
    expect(emailRes.internalAlert.delivered).toBe(true);

    // Verify public report never leaks lead PII or internal notes
    const publicReport = await getPublicAuditReportById(auditId);
    const serialized = JSON.stringify(publicReport);
    expect(serialized).not.toContain("taylor@fast-saas.example");
    expect(serialized).not.toContain("CONFIDENTIAL_INTERNAL_NOTE_DO_NOT_LEAK");
  });
});
