import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import {
  AppSettingsSchema,
  getAppSettings,
  updateAppSettings,
} from "@/lib/settings";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Administrator authentication required." } },
      { status: 401 }
    );
  }

  const settings = await getAppSettings();

  // Never expose raw API keys or secrets; only expose boolean configuration status
  return NextResponse.json({
    settings,
    integrationStatus: {
      pageSpeedKeyConfigured: Boolean(process.env.GOOGLE_PAGESPEED_API_KEY),
      cruxKeyConfigured: Boolean(
        process.env.GOOGLE_CRUX_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY
      ),
      aiKeyConfigured: Boolean(process.env.AI_API_KEY),
      resendKeyConfigured: Boolean(process.env.RESEND_API_KEY),
      ga4Configured: Boolean(process.env.NEXT_PUBLIC_GA4_ID),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Administrator authentication required." } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const partialSchema = AppSettingsSchema.partial();
    const parsed = partialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message || "Invalid settings values.",
          },
        },
        { status: 400 }
      );
    }

    const updated = await updateAppSettings(parsed.data);
    return NextResponse.json({ settings: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to save settings." } },
      { status: 500 }
    );
  }
}
