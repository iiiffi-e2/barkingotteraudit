import { NextRequest, NextResponse } from "next/server";
import { getPublicAuditReportById } from "@/lib/audit-runner";

const STAGE_DETAILS: Record<
  string,
  { stepNumber: number; totalSteps: number; label: string; description: string }
> = {
  QUEUED: {
    stepNumber: 1,
    totalSteps: 6,
    label: "Preparing your analysis",
    description:
      "Validating your website address and initializing our test environment.",
  },
  ANALYZING_MOBILE: {
    stepNumber: 2,
    totalSteps: 6,
    label: "Checking mobile performance",
    description:
      "Testing how quickly your page loads and responds on a mobile connection.",
  },
  ANALYZING_DESKTOP: {
    stepNumber: 3,
    totalSteps: 6,
    label: "Checking desktop performance",
    description:
      "Measuring layout stability, visual speed, and desktop browser performance.",
  },
  REVIEWING_METRICS: {
    stepNumber: 4,
    totalSteps: 6,
    label: "Reviewing performance metrics",
    description:
      "Evaluating Core Web Vitals and checking Chrome UX Report field data.",
  },
  IDENTIFYING_OPPORTUNITIES: {
    stepNumber: 5,
    totalSteps: 6,
    label: "Identifying optimization opportunities",
    description:
      "Prioritizing the specific assets, scripts, and server factors slowing down your page.",
  },
  PREPARING_REPORT: {
    stepNumber: 6,
    totalSteps: 6,
    label: "Preparing your report",
    description:
      "Translating technical diagnostics into clear, plain-English recommendations.",
  },
  COMPLETED: {
    stepNumber: 6,
    totalSteps: 6,
    label: "Report complete",
    description: "Your website performance report is ready.",
  },
  PARTIAL: {
    stepNumber: 6,
    totalSteps: 6,
    label: "Report ready (partial results)",
    description:
      "One device test completed while the other encountered an issue.",
  },
  FAILED: {
    stepNumber: 0,
    totalSteps: 6,
    label: "Analysis could not be completed",
    description: "We encountered an issue testing this website.",
  },
  EXPIRED: {
    stepNumber: 0,
    totalSteps: 6,
    label: "Report expired",
    description: "This archived report has passed its retention window.",
  },
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const report = await getPublicAuditReportById(id);

    if (!report) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Audit not found.",
          },
        },
        { status: 404 }
      );
    }

    const stage = STAGE_DETAILS[report.status] || STAGE_DETAILS.QUEUED;
    const isTerminal = ["COMPLETED", "PARTIAL", "FAILED", "EXPIRED"].includes(
      report.status
    );

    return NextResponse.json({
      id: report.id,
      hostname: report.hostname,
      normalizedUrl: report.normalizedUrl,
      status: report.status,
      isTerminal,
      stage,
      mobileStatus: report.runs.MOBILE?.status ?? "PENDING",
      desktopStatus: report.runs.DESKTOP?.status ?? "PENDING",
      mobileScore: report.runs.MOBILE?.performanceScore ?? null,
      desktopScore: report.runs.DESKTOP?.performanceScore ?? null,
      errorCode: report.errorCode,
      errorMessage: report.errorMessage,
      createdAt: report.createdAt,
      startedAt: report.startedAt,
      completedAt: report.completedAt,
      events: report.events,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to check audit status.",
        },
      },
      { status: 500 }
    );
  }
}
