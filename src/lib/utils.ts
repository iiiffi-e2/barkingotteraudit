import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function getScoreBand(score: number | null | undefined): "good" | "needs-improvement" | "poor" | "unknown" {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return "unknown";
  }
  if (score >= 90) return "good";
  if (score >= 50) return "needs-improvement";
  return "poor";
}

export function getScoreLabel(score: number | null | undefined): string {
  const band = getScoreBand(score);
  switch (band) {
    case "good":
      return "Good";
    case "needs-improvement":
      return "Needs Improvement";
    case "poor":
      return "Poor";
    default:
      return "Unavailable";
  }
}

export function getContextualScoreHeadline(
  score: number | null | undefined,
  device: "MOBILE" | "DESKTOP"
): { headline: string; subheadline: string } {
  const deviceLabel = device === "MOBILE" ? "mobile" : "desktop";
  if (score === null || score === undefined) {
    return {
      headline: `We couldn't complete a ${deviceLabel} score for this page.`,
      subheadline: "Review the available diagnostics or rerun the test to check again.",
    };
  }
  if (score >= 90) {
    return {
      headline: `Your ${deviceLabel} website is performing well. Let's look for opportunities to keep it that way.`,
      subheadline:
        "Fast pages create a smoother visitor experience. A few targeted checks can help protect your speed as your site grows.",
    };
  }
  if (score >= 50) {
    return {
      headline: `Your ${deviceLabel} website is doing some things well, but there are opportunities to speed it up.`,
      subheadline:
        "Targeted optimizations to page assets, scripts, and delivery can noticeably improve how quickly visitors see your content.",
    };
  }
  return {
    headline: `Your ${deviceLabel} website has significant room for improvement.`,
    subheadline:
      "Visitors are likely waiting longer than necessary for key content to load and respond. Addressing the highest-priority bottlenecks first will make the biggest difference.",
  };
}
