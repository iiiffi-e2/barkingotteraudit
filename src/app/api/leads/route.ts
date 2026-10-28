import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  checkRateLimit,
  extractClientIp,
  hashClientIp,
} from "@/lib/rate-limit";
import { getAppSettings } from "@/lib/settings";
import { sendLeadConfirmationAndInternalAlert } from "@/lib/email";

const LeadSubmissionSchema = z.object({
  auditId: z.string().max(64).optional().nullable(),
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(120, "Name is too long."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid business email address.")
    .max(180),
  company: z.string().trim().max(140).optional().nullable(),
  websiteUrl: z
    .string()
    .trim()
    .min(3, "Please enter your website URL.")
    .max(500),
  goalOrConcern: z.string().trim().max(300).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  source: z
    .string()
    .trim()
    .max(80)
    .optional()
    .default("OPTIMIZATION_PLAN"),
  marketingConsent: z.boolean().optional().default(false),
  // Honeypot anti-spam field
  companyWebsiteTrap: z.string().max(0).optional(),
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

    const parsed = LeadSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ||
              "Please check your form details and try again.",
          },
        },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(req.headers);
    const ipHash = hashClientIp(clientIp);
    const rateLimit = checkRateLimit(
      "lead_submissions",
      ipHash,
      10,
      60 * 60 * 1000
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message:
              "Too many requests received from this connection. Please wait a few minutes and try again.",
          },
        },
        { status: 429 }
      );
    }

    // Verify auditId if provided
    let validAuditId: string | null = null;
    if (parsed.data.auditId) {
      const existingAudit = await prisma.audit.findUnique({
        where: { id: parsed.data.auditId },
        select: { id: true },
      });
      if (existingAudit) {
        validAuditId = existingAudit.id;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        auditId: validAuditId,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        company: parsed.data.company || null,
        websiteUrl: parsed.data.websiteUrl,
        goalOrConcern: parsed.data.goalOrConcern || null,
        message: parsed.data.message || null,
        source: parsed.data.source,
        marketingConsent: parsed.data.marketingConsent,
        status: "NEW",
      },
    });

    const settings = await getAppSettings();
    const emailDelivery = await sendLeadConfirmationAndInternalAlert({
      leadId: lead.id,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      websiteUrl: lead.websiteUrl,
      goalOrConcern: lead.goalOrConcern,
      message: lead.message,
      auditId: lead.auditId,
      source: lead.source,
      notificationRecipients: settings.notificationRecipients,
    });

    return NextResponse.json(
      {
        leadId: lead.id,
        auditId: lead.auditId,
        status: lead.status,
        confirmationHeadline: "Your Request Is In.",
        confirmationMessage:
          "We've received your website assessment and request. We'll review the findings and follow up with recommendations.",
        emailDelivery: {
          prospectConfirmationSent: emailDelivery.prospectEmail.delivered,
          internalNotificationSent: emailDelivery.internalAlert.delivered,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message:
            "We couldn't submit your request right now. Please try again shortly.",
        },
      },
      { status: 500 }
    );
  }
}
