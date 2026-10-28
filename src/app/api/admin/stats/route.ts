import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Administrator authentication required." } },
      { status: 401 }
    );
  }

  try {
    const [
      totalAudits,
      failedAudits,
      totalLeads,
      uniqueHostsGroup,
      mobileScores,
      desktopScores,
      totalRunsCompleted,
      totalCruxQueries,
      totalAiCalls,
      recentAuditsRaw,
    ] = await Promise.all([
      prisma.audit.count(),
      prisma.audit.count({ where: { status: "FAILED" } }),
      prisma.lead.count(),
      prisma.audit.groupBy({ by: ["hostname"] }),
      prisma.auditRun.findMany({
        where: { device: "MOBILE", performanceScore: { not: null } },
        select: { performanceScore: true },
      }),
      prisma.auditRun.findMany({
        where: { device: "DESKTOP", performanceScore: { not: null } },
        select: { performanceScore: true },
      }),
      prisma.auditRun.count({ where: { status: "COMPLETED" } }),
      prisma.cruxSnapshot.count(),
      prisma.aIAnalysis.count({ where: { isFallback: false } }),
      prisma.audit.findMany({
        orderBy: { createdAt: "desc" },
        take: 250,
        select: { createdAt: true, status: true },
      }),
    ]);

    const avgMobile =
      mobileScores.length > 0
        ? Math.round(
            mobileScores.reduce((sum, r) => sum + (r.performanceScore ?? 0), 0) /
              mobileScores.length
          )
        : null;

    const avgDesktop =
      desktopScores.length > 0
        ? Math.round(
            desktopScores.reduce((sum, r) => sum + (r.performanceScore ?? 0), 0) /
              desktopScores.length
          )
        : null;

    // Score distribution (based on mobile scores, the primary view)
    const distribution = {
      good: mobileScores.filter((r) => (r.performanceScore ?? 0) >= 90).length,
      needsImprovement: mobileScores.filter(
        (r) => (r.performanceScore ?? 0) >= 50 && (r.performanceScore ?? 0) < 90
      ).length,
      poor: mobileScores.filter((r) => (r.performanceScore ?? 0) < 50).length,
    };

    // Audits over time (last 7 days)
    const dayCounts = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      dayCounts.set(key, 0);
    }
    for (const item of recentAuditsRaw) {
      const key = item.createdAt.toISOString().slice(0, 10);
      if (dayCounts.has(key)) {
        dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
      }
    }

    const auditsOverTime = Array.from(dayCounts.entries()).map(
      ([date, count]) => ({ date, count })
    );

    const conversionRatePercent =
      totalAudits > 0
        ? Number(((totalLeads / totalAudits) * 100).toFixed(1))
        : 0;

    return NextResponse.json({
      totalAudits,
      uniqueWebsitesTested: uniqueHostsGroup.length,
      averageMobileScore: avgMobile,
      averageDesktopScore: avgDesktop,
      scoreDistribution: distribution,
      leadSubmissions: totalLeads,
      conversionRatePercent,
      scanFailures: failedAudits,
      auditsOverTime,
      estimatedUsage: {
        pageSpeedApiCalls: totalRunsCompleted,
        cruxApiQueries: totalCruxQueries,
        aiModelInterpretations: totalAiCalls,
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load admin stats." } },
      { status: 500 }
    );
  }
}
