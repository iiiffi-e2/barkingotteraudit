import { NextRequest, NextResponse } from "next/server";
import { getPublicAuditReportById } from "@/lib/audit-runner";
import { generateBrandedPdfBuffer } from "@/lib/pdf-report";

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
            message: "Performance report not found.",
          },
        },
        { status: 404 }
      );
    }

    if (report.status !== "COMPLETED" && report.status !== "PARTIAL") {
      return NextResponse.json(
        {
          error: {
            code: "REPORT_NOT_READY",
            message:
              "This report is not ready for PDF download yet. Please wait for the scan to complete.",
          },
        },
        { status: 409 }
      );
    }

    const pdfBuffer = generateBrandedPdfBuffer(report);
    const safeHost = report.hostname.replace(/[^a-z0-9.-]/gi, "-");
    const filename = `barking-otter-report-${safeHost}-${report.id.slice(0, 8)}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "PDF_GENERATION_FAILED",
          message: "Unable to generate the PDF report right now.",
        },
      },
      { status: 500 }
    );
  }
}
