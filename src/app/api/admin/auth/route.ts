import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  isEmailAllowedForAdmin,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

const AdminLoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid admin email address."),
  accessToken: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AdminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message || "Invalid email address.",
          },
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    if (!isEmailAllowedForAdmin(email)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message:
              "This email address is not on the authorized Barking Otter administrator allowlist.",
          },
        },
        { status: 403 }
      );
    }

    const requiredToken = process.env.ADMIN_ACCESS_TOKEN?.trim();
    if (
      requiredToken &&
      parsed.data.accessToken &&
      parsed.data.accessToken !== requiredToken
    ) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid administrator access token.",
          },
        },
        { status: 401 }
      );
    }

    // Record or update AdminUser entry
    await prisma.adminUser.upsert({
      where: { email },
      create: { email, role: "ADMIN" },
      update: {},
    });

    const sessionToken = createAdminSessionToken(email);
    const res = NextResponse.json({
      authenticated: true,
      email,
    });

    res.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to sign in right now.",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ authenticated: false });
  res.cookies.delete(ADMIN_SESSION_COOKIE);
  return res;
}
