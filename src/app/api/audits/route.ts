import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateAndNormalizeUrl } from "@/lib/url-validation";
import { createOrReuseCachedAudit } from "@/lib/audit-runner";
import {
  checkRateLimit,
  extractClientIp,
  hashClientIp,
} from "@/lib/rate-limit";
import { getAppSettings } from "@/lib/settings";

const CreateAuditRequestSchema = z.object({
  url: z.string().min(1, "Please enter a website URL."),
  source: z
    .enum(["PUBLIC_WEB", "HOMEPAGE_WIDGET", "PUBLIC_RERUN", "ADMIN_RERUN", "API"])
    .optional()
    .default("PUBLIC_WEB"),
  forceRerun: z.boolean().optional().default(false),
  allowHttp: z.boolean().optional().default(false),
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
            message: "Invalid request payload. Please submit a valid JSON body.",
          },
        },
        { status: 400 }
      );
    }

    const parsedBody = CreateAuditRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsedBody.error.issues[0]?.message ||
              "Please enter a valid website URL.",
          },
        },
        { status: 400 }
      );
    }

    const urlValidation = validateAndNormalizeUrl(parsedBody.data.url, {
      allowHttp: parsedBody.data.allowHttp,
    });

    if (
      !urlValidation.valid ||
      !urlValidation.normalizedUrl ||
      !urlValidation.hostname
    ) {
      return NextResponse.json(
        {
          error: {
            code: urlValidation.errorCode || "INVALID_URL",
            message:
              urlValidation.errorMessage ||
              "Please enter a valid public website URL.",
          },
        },
        { status: 400 }
      );
    }

    const settings = await getAppSettings();
    const clientIp = extractClientIp(req.headers);
    const ipHash = hashClientIp(clientIp);

    const rateLimit = checkRateLimit(
      "public_audits",
      ipHash,
      settings.publicRateLimitPerHour,
      60 * 60 * 1000
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message:
              "You've run several website analyses recently. Please wait a few minutes before starting another test.",
            retryAfterSeconds: rateLimit.retryAfterSeconds,
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const { auditId, cached } = await createOrReuseCachedAudit({
      requestedUrl: parsedBody.data.url.trim(),
      normalizedUrl: urlValidation.normalizedUrl,
      hostname: urlValidation.hostname,
      source: parsedBody.data.source,
      requesterIpHash: ipHash,
      forceRerun: parsedBody.data.forceRerun,
    });

    return NextResponse.json(
      {
        id: auditId,
        normalizedUrl: urlValidation.normalizedUrl,
        hostname: urlValidation.hostname,
        cached,
        reportUrl: `/audit/${auditId}`,
      },
      { status: cached ? 200 : 202 }
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message:
            "We couldn't start your website analysis right now. Please try again in a moment.",
        },
      },
      { status: 500 }
    );
  }
}
