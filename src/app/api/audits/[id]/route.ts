import { NextRequest, NextResponse } from "next/server";
import { getPublicAuditReportById } from "@/lib/audit-runner";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id || id.length > 64) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_ID",
            message: "Invalid report identifier.",
          },
        },
        { status: 400 }
      );
    }

    const report = await getPublicAuditReportById(id);
    if (!report) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "We couldn't find a performance report with that ID.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ report });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to load the performance report right now.",
        },
      },
      { status: 500 }
    );
  }
}
