import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "bo_admin_session";

function getSecret(): string {
  return process.env.AUTH_SECRET || "barking-otter-local-dev-auth-secret-key-2026";
}

export function getAdminAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAIL_ALLOWLIST || "admin@barkingotter.com";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowedForAdmin(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const allowlist = getAdminAllowlist();
  return allowlist.includes(normalized);
}

export function createAdminSessionToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  const exp = Date.now() + 1000 * 60 * 60 * 12; // 12 hours
  const payload = JSON.stringify({ email: normalized, exp });
  const encoded = Buffer.from(payload, "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): {
  authenticated: boolean;
  email?: string;
} {
  if (!token || !token.includes(".")) {
    return { authenticated: false };
  }
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return { authenticated: false };

  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { authenticated: false };
    }

    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as {
      email?: string;
      exp?: number;
    };

    if (!decoded.email || !decoded.exp || decoded.exp < Date.now()) {
      return { authenticated: false };
    }

    if (!isEmailAllowedForAdmin(decoded.email)) {
      return { authenticated: false };
    }

    return { authenticated: true, email: decoded.email };
  } catch {
    return { authenticated: false };
  }
}

export async function verifyAdminRequest(req?: NextRequest): Promise<{
  authenticated: boolean;
  email?: string;
}> {
  if (req) {
    // Check Authorization Bearer or x-admin-token header
    const authHeader = req.headers.get("authorization");
    const adminTokenHeader = req.headers.get("x-admin-token");
    const configuredAccessToken = process.env.ADMIN_ACCESS_TOKEN;

    if (
      configuredAccessToken &&
      (adminTokenHeader === configuredAccessToken ||
        authHeader === `Bearer ${configuredAccessToken}`)
    ) {
      const firstAdmin = getAdminAllowlist()[0] || "admin@barkingotter.com";
      return { authenticated: true, email: firstAdmin };
    }

    const cookieToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const verified = verifyAdminSessionToken(cookieToken);
    if (verified.authenticated) return verified;
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    return verifyAdminSessionToken(token);
  } catch {
    return { authenticated: false };
  }
}
