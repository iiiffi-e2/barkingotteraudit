import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createOrReuseCachedAudit } from "@/lib/audit-runner";
import {
  checkRateLimit,
  extractClientIp,
  hashClientIp,
} from "@/lib/rate-limit";
import { validateAndNormalizeUrl } from "@/lib/url-validation";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const existing = await prisma.audit.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Original audit not found.",
          },
        },
        { status: 404 }
      );
    }

    let allowHttp = false;
    try {
      const body = (await req.json()) as { allowHttp?: boolean };
      allowHttp = Boolean(body?.allowHttp);
    } catch {
      // Optional body
    }

    const clientIp = extractClientIp(req.headers);
    const ipHash = hashClientIp(clientIp);
    const rateLimit = checkRateLimit(
      "public_reruns",
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
              "Please wait a few minutes before requesting another fresh rerun.",
            retryAfterSeconds: rateLimit.retryAfterSeconds,
          },
        },
        { status: 429 }
      );
    }

    let targetUrl = existing.normalizedUrl;
    if (allowHttp && targetUrl.startsWith("https://")) {
      const httpCandidate = "http://" + targetUrl.slice(8);
      const validated = validateAndNormalizeUrl(httpCandidate, {
        allowHttp: true,
      });
      if (validated.valid && validated.normalizedUrl) {
        targetUrl = validated.normalizedUrl;
      }
    }

    const { auditId } = await createOrReuseCachedAudit({
      requestedUrl: targetUrl,
      normalizedUrl: targetUrl,
      hostname: existing.hostname,
      source: "PUBLIC_RERUN",
      requesterIpHash: ipHash,
      forceRerun: true,
    });

    return NextResponse.json(
      {
        id: auditId,
        normalizedUrl: targetUrl,
        reportUrl: `/audit/${auditId}`,
      },
      { status: 202 }
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to initiate a rerun at this time.",
        },
      },
      { status: 500 }
    );
  }
}
