function isIPv4Format(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return false;
    if (part.length > 1 && part.startsWith("0")) return false;
    const n = Number(part);
    if (n < 0 || n > 255) return false;
  }
  return true;
}

function isIPv6Format(host: string): boolean {
  const clean = host.replace(/^\[|\]$/g, "");
  if (!clean.includes(":")) return false;
  return /^[0-9a-f:.]+$/i.test(clean);
}

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  hostname?: string;
  protocol?: "https:" | "http:";
  strippedParams?: string[];
  errorCode?:
    | "EMPTY_URL"
    | "URL_TOO_LONG"
    | "UNSUPPORTED_SCHEME"
    | "EMBEDDED_CREDENTIALS"
    | "UNSUPPORTED_PORT"
    | "PRIVATE_OR_LOCAL_ADDRESS"
    | "INVALID_HOSTNAME"
    | "INVALID_SYNTAX";
  errorMessage?: string;
}

const TRACKING_AND_SENSITIVE_PARAMS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "twclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "_ga",
  "_gl",
  "_hsenc",
  "_hsmi",
  "hsCtaTracking",
  "mkt_tok",
  "vero_id",
  "oly_enc_id",
  "oly_anon_id",
  "rb_clickid",
  "s_kwcid",
  "token",
  "access_token",
  "id_token",
  "refresh_token",
  "auth",
  "auth_token",
  "password",
  "passwd",
  "secret",
  "api_key",
  "apikey",
  "session",
  "sessionid",
  "session_id",
  " phpsessid",
  "phpsessid",
  "jsessionid",
  "jwt",
  "key",
  "private_key",
  "signature",
  "sig",
]);

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "local",
  "broadcasthost",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "kubernetes",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

const BLOCKED_TLD_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".corp",
  ".home",
  ".lan",
  ".localdomain",
  ".arpa",
];

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b, c] = parts;
  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 100.64.0.0/10 (Shared Address Space / CGNAT & Alibaba metadata 100.100.100.200)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-local & Cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;
  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Documentation TEST-NET)
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved / Broadcast)
  if (a >= 224) return true;

  return false;
}

function isPrivateOrReservedIpv6(rawHost: string): boolean {
  const ip = rawHost.replace(/^\[|\]$/g, "").toLowerCase();
  if (ip === "::" || ip === "::1" || ip === "0:0:0:0:0:0:0:1" || ip === "0:0:0:0:0:0:0:0") {
    return true;
  }
  // Unique local addresses fc00::/7 (fc00... or fd00...)
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  // Link-local fe80::/10
  if (ip.startsWith("fe8") || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb")) {
    return true;
  }
  // Multicast ff00::/8
  if (ip.startsWith("ff")) return true;
  // Documentation 2001:db8::/32
  if (ip.startsWith("2001:db8:") || ip.startsWith("2001:0db8:")) return true;
  // IPv4-mapped IPv6 ::ffff:a.b.c.d or hex ::ffff:7f00:1
  if (ip.includes("::ffff:")) {
    const v4Part = ip.split("::ffff:")[1];
    if (v4Part && isIPv4Format(v4Part)) {
      return isPrivateOrReservedIpv4(v4Part);
    }
    return true;
  }
  return false;
}

function isSuspiciousNumericHost(hostname: string): boolean {
  // Block integer IP representations (e.g. 2130706433) or hex/octal IP representations (0x7f.0.0.1, 0177.0.0.1)
  if (/^\d+$/.test(hostname)) return true;
  if (/^0x[0-9a-f]+$/i.test(hostname)) return true;
  const labels = hostname.split(".");
  if (labels.every((label) => /^\d+$/.test(label) || /^0x[0-9a-f]+$/i.test(label))) {
    // All numeric/hex segments: if not standard decimal IPv4, block immediately
    if (!isIPv4Format(hostname)) return true;
    // Also block leading zeroes (octal notation like 0177.0.0.1)
    if (labels.some((l) => l.length > 1 && l.startsWith("0"))) return true;
  }
  return false;
}

export function shouldStripQueryParam(paramName: string): boolean {
  const lower = paramName.toLowerCase().trim();
  if (lower.startsWith("utm_")) return true;
  if (lower.startsWith("hsa_")) return true;
  if (lower.startsWith("pk_")) return true;
  if (lower.startsWith("matomo_")) return true;
  return TRACKING_AND_SENSITIVE_PARAMS.has(lower);
}

export function validateAndNormalizeUrl(
  rawInput: string,
  options?: { allowHttp?: boolean }
): UrlValidationResult {
  if (typeof rawInput !== "string") {
    return {
      valid: false,
      errorCode: "EMPTY_URL",
      errorMessage: "Please enter a website URL to analyze.",
    };
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      valid: false,
      errorCode: "EMPTY_URL",
      errorMessage: "Please enter a website URL to analyze (for example, example.com).",
    };
  }

  if (trimmed.length > 2048) {
    return {
      valid: false,
      errorCode: "URL_TOO_LONG",
      errorMessage: "That URL is too long. Please enter a standard website URL under 2,048 characters.",
    };
  }

  // Reject whitespace inside the URL
  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      errorCode: "INVALID_SYNTAX",
      errorMessage: "URLs cannot contain spaces. Please check the address and try again.",
    };
  }

  // Check if a scheme is already present
  let candidate = trimmed;
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);

  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== "https" && scheme !== "http") {
      return {
        valid: false,
        errorCode: "UNSUPPORTED_SCHEME",
        errorMessage: `The "${scheme}:" protocol is not supported. Please enter an HTTPS or HTTP website address.`,
      };
    }
    if (!trimmed.startsWith(`${schemeMatch[1]}://`)) {
      return {
        valid: false,
        errorCode: "INVALID_SYNTAX",
        errorMessage: "Please enter a complete website URL such as https://example.com.",
      };
    }
    // Normalize http:// to https:// by default unless allowHttp is explicitly enabled
    if (scheme === "http" && !options?.allowHttp) {
      candidate = "https://" + trimmed.slice(7);
    }
  } else if (trimmed.startsWith("//")) {
    candidate = "https:" + trimmed;
  } else {
    candidate = "https://" + trimmed;
  }

  // Check for embedded credentials before or after URL parsing
  const authorityPart = candidate.replace(/^https?:\/\//i, "").split(/[/?#]/)[0];
  if (authorityPart.includes("@")) {
    return {
      valid: false,
      errorCode: "EMBEDDED_CREDENTIALS",
      errorMessage: "URLs containing usernames or passwords are not permitted for security reasons.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      valid: false,
      errorCode: "INVALID_SYNTAX",
      errorMessage: "That doesn't look like a valid website address. Try entering a domain like example.com.",
    };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      valid: false,
      errorCode: "UNSUPPORTED_SCHEME",
      errorMessage: "Only HTTP and HTTPS websites can be analyzed.",
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      errorCode: "EMBEDDED_CREDENTIALS",
      errorMessage: "URLs containing embedded credentials are not allowed.",
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname) {
    return {
      valid: false,
      errorCode: "INVALID_HOSTNAME",
      errorMessage: "Please enter a valid domain name.",
    };
  }

  // Check blocked hostnames and suffixes
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_TLD_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    return {
      valid: false,
      errorCode: "PRIVATE_OR_LOCAL_ADDRESS",
      errorMessage: "Localhost and internal network addresses cannot be tested. Please enter a public website.",
    };
  }

  // Restrict non-standard ports
  if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
    return {
      valid: false,
      errorCode: "UNSUPPORTED_PORT",
      errorMessage: "Only standard web ports (80 and 443) are supported for public website analysis.",
    };
  }

  // Check IPv6 literal
  if (hostname.startsWith("[") || isIPv6Format(hostname)) {
    const cleanV6 = hostname.replace(/^\[|\]$/g, "");
    if (!isIPv6Format(cleanV6) || isPrivateOrReservedIpv6(cleanV6)) {
      return {
        valid: false,
        errorCode: "PRIVATE_OR_LOCAL_ADDRESS",
        errorMessage: "Private, loopback, or reserved IPv6 addresses cannot be analyzed.",
      };
    }
  } else if (isSuspiciousNumericHost(hostname) || isIPv4Format(hostname)) {
    if (isIPv4Format(hostname)) {
      if (isPrivateOrReservedIpv4(hostname)) {
        return {
          valid: false,
          errorCode: "PRIVATE_OR_LOCAL_ADDRESS",
          errorMessage: "Private, internal, or reserved IP addresses cannot be analyzed.",
        };
      }
    } else {
      return {
        valid: false,
        errorCode: "PRIVATE_OR_LOCAL_ADDRESS",
        errorMessage: "Non-standard numeric IP addresses are not permitted.",
      };
    }
  } else {
    // Domain name validation
    const labels = hostname.split(".");
    if (labels.length < 2) {
      return {
        valid: false,
        errorCode: "INVALID_HOSTNAME",
        errorMessage: "Please include a full domain extension (for example, example.com).",
      };
    }
    const tld = labels[labels.length - 1];
    if (tld.length < 2 || !/^[a-z]{2,63}$|^xn--[a-z0-9]+$/i.test(tld)) {
      return {
        valid: false,
        errorCode: "INVALID_HOSTNAME",
        errorMessage: "Please enter a domain with a valid top-level extension (such as .com, .org, or .io).",
      };
    }
    const validLabelRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
    if (labels.some((label) => !validLabelRegex.test(label))) {
      return {
        valid: false,
        errorCode: "INVALID_HOSTNAME",
        errorMessage: "That domain name contains invalid characters or formatting.",
      };
    }
  }

  // Remove URL fragment
  parsed.hash = "";
  parsed.hostname = hostname;

  // Strip default ports
  if (
    (parsed.protocol === "https:" && parsed.port === "443") ||
    (parsed.protocol === "http:" && parsed.port === "80")
  ) {
    parsed.port = "";
  }

  // Filter out tracking & sensitive query parameters, preserve and sort legitimate ones
  const strippedParams: string[] = [];
  const keptEntries: [string, string][] = [];
  for (const [key, value] of parsed.searchParams.entries()) {
    if (shouldStripQueryParam(key)) {
      strippedParams.push(key);
    } else {
      keptEntries.push([key, value]);
    }
  }
  keptEntries.sort(([a], [b]) => a.localeCompare(b));
  parsed.search = "";
  for (const [k, v] of keptEntries) {
    parsed.searchParams.append(k, v);
  }

  // Normalize trailing slash on root path only, preserve subpaths accurately
  let normalizedUrl = parsed.toString();
  if (parsed.pathname === "/" && !parsed.search) {
    normalizedUrl = `${parsed.protocol}//${parsed.host}`;
  }

  return {
    valid: true,
    normalizedUrl,
    hostname,
    protocol: parsed.protocol as "https:" | "http:",
    strippedParams,
  };
}

export function computeAuditDedupeKey(normalizedUrl: string, cacheBucketHours = 24): string {
  const bucket = Math.floor(Date.now() / (cacheBucketHours * 3600 * 1000));
  const input = `v1:${normalizedUrl.toLowerCase()}:${bucket}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  let h3 = 0x9e3779b9 ^ input.length;
  let h4 = 0x85ebca6b ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);
  return [h1, h2, h3, h4]
    .map((n) => (n >>> 0).toString(16).padStart(8, "0"))
    .join("");
}
