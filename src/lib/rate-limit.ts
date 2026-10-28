import crypto from "crypto";

interface RateBucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, RateBucket>();

export function hashClientIp(ip: string): string {
  const salt = process.env.AUTH_SECRET || "barking-otter-rate-limit-salt";
  return crypto
    .createHash("sha256")
    .update(`${ip}:${salt}`)
    .digest("hex")
    .slice(0, 24);
}

export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "127.0.0.1";
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  namespace: string,
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitCheckResult {
  const now = Date.now();
  const key = `${namespace}:${identifier}`;
  const existing = memoryBuckets.get(key);

  // Clean up expired buckets periodically
  if (memoryBuckets.size > 5000) {
    for (const [k, v] of memoryBuckets.entries()) {
      if (v.resetAt <= now) {
        memoryBuckets.delete(k);
      }
    }
  }

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitsForTests() {
  memoryBuckets.clear();
}
