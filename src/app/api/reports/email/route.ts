import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPublicAuditReportById } from "@/lib/audit-runner";
import {
  checkRateLimit,
  extractClientIp,
  hashClientIp,
} from "@/lib/rate-limit";
import { sendReportLinkEmail } from "@/lib/email";

const EmailReportSchema = z.object({
  auditId: z.string().min(1).max(64),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address to receive your report link.")
    .max(180),
});

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_JSON",
            message: "Invalid request payload.",
          },
        },
        { status: 400 }
      );
    }

    const parsed = EmailReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ||
              "Please enter a valid email address.",
          },
        },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(req.headers);
    const ipHash = hashClientIp(clientIp);
    const rateLimit = checkRateLimit(
      "email_reports",
      ipHash,
      8,
      60 * 60 * 1000
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message:
              "You've sent several report emails recently. Please wait a few minutes before sending another.",
          },
        },
        { status: 429 }
      );
    }

    const report = await getPublicAuditReportById(parsed.data.auditId);
    if (!report) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "We couldn't find that performance report.",
          },
        },
        { status: 404 }
      );
    }

    const delivery = await sendReportLinkEmail({
      recipientEmail: parsed.data.email.toLowerCase(),
      auditId: report.id,
      normalizedUrl: report.normalizedUrl,
      mobileScore: report.runs.MOBILE?.performanceScore ?? null,
      desktopScore: report.runs.DESKTOP?.performanceScore ?? null,
    });

    if (!delivery.delivered) {
      return NextResponse.json(
        {
          error: {
            code: "EMAIL_DELIVERY_FAILED",
            message:
              delivery.error ||
              "We couldn't send the report email right now. You can still copy your report link directly.",
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      sent: true,
      recipient: parsed.data.email.toLowerCase(),
      provider: delivery.provider,
      message:
        "We've sent a link to this report to your inbox. We do not subscribe report recipients to marketing emails.",
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to send the report email right now.",
        },
      },
      { status: 500 }
    );
  }
}
