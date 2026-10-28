import { jsPDF } from "jspdf";
import { PublicAuditReport } from "@/types/audit";
import { getScoreLabel } from "@/lib/utils";

export function generateBrandedPdfBuffer(report: PublicAuditReport): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  let y = 44;

  // Brand Header Banner
  doc.setFillColor(15, 23, 42); // Deep slate / navy
  doc.roundedRect(margin, y, contentWidth, 68, 8, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("BARKING OTTER", margin + 20, y + 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text("Website Performance Assessment Report", margin + 20, y + 46);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11); // Warm amber brand accent
  doc.text("barkingotter.com", pageWidth - margin - 108, y + 36);

  y += 88;

  // Tested Website & Date Metadata
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Tested URL: ${report.normalizedUrl}`, margin, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const testedDate = new Date(report.completedAt || report.createdAt).toUTCString();
  doc.text(`Analysis Date: ${testedDate}   |   Report ID: ${report.id}`, margin, y);
  y += 14;

  if (report.finalUrl && report.finalUrl !== report.normalizedUrl) {
    doc.text(`Final Redirected URL: ${report.finalUrl}`, margin, y);
    y += 14;
  }

  doc.text(
    `Scope Note: This assessment measures the submitted page URL (${report.normalizedUrl}), not every page on the domain.`,
    margin,
    y
  );
  y += 22;

  // Score Summary Boxes (Mobile & Desktop)
  const boxWidth = (contentWidth - 16) / 2;
  const mobileScore = report.runs.MOBILE?.performanceScore ?? null;
  const desktopScore = report.runs.DESKTOP?.performanceScore ?? null;

  // Mobile Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, boxWidth, 66, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("MOBILE PERFORMANCE", margin + 14, y + 20);
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(
    mobileScore !== null ? `${mobileScore} / 100` : "Unavailable",
    margin + 14,
    y + 46
  );
  doc.setFontSize(10);
  doc.text(`(${getScoreLabel(mobileScore)})`, margin + 115, y + 44);

  // Desktop Box
  const rightBoxX = margin + boxWidth + 16;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightBoxX, y, boxWidth, 66, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("DESKTOP PERFORMANCE", rightBoxX + 14, y + 20);
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(
    desktopScore !== null ? `${desktopScore} / 100` : "Unavailable",
    rightBoxX + 14,
    y + 46
  );
  doc.setFontSize(10);
  doc.text(`(${getScoreLabel(desktopScore)})`, rightBoxX + 115, y + 44);

  y += 84;

  // Executive Plain-English Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Executive Summary — Here's What We Found", margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const summaryText =
    report.aiAnalysis?.output.summary ||
    "We completed a laboratory and field performance check of your page. Review the metrics and prioritized opportunities below.";
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
  doc.text(splitSummary, margin, y);
  y += splitSummary.length * 13 + 12;

  // Laboratory Performance Metrics Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Laboratory Performance Metrics (Lighthouse)", margin, y);
  y += 14;

  const mobileMetrics = report.runs.MOBILE?.metrics;
  const desktopMetrics = report.runs.DESKTOP?.metrics;

  const metricRows = [
    {
      name: "Largest Contentful Paint (LCP)",
      mob: mobileMetrics?.lcp.displayValue ?? "N/A",
      desk: desktopMetrics?.lcp.displayValue ?? "N/A",
      target: "<= 2.5 s",
    },
    {
      name: "First Contentful Paint (FCP)",
      mob: mobileMetrics?.fcp.displayValue ?? "N/A",
      desk: desktopMetrics?.fcp.displayValue ?? "N/A",
      target: "<= 1.8 s",
    },
    {
      name: "Total Blocking Time (TBT - Lab)",
      mob: mobileMetrics?.tbt.displayValue ?? "N/A",
      desk: desktopMetrics?.tbt.displayValue ?? "N/A",
      target: "<= 200 ms",
    },
    {
      name: "Cumulative Layout Shift (CLS)",
      mob: mobileMetrics?.cls.displayValue ?? "N/A",
      desk: desktopMetrics?.cls.displayValue ?? "N/A",
      target: "<= 0.10",
    },
    {
      name: "Speed Index",
      mob: mobileMetrics?.speedIndex.displayValue ?? "N/A",
      desk: desktopMetrics?.speedIndex.displayValue ?? "N/A",
      target: "<= 3.4 s",
    },
  ];

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Metric", margin, y);
  doc.text("Mobile", margin + 230, y);
  doc.text("Desktop", margin + 330, y);
  doc.text("Good Threshold", margin + 430, y);
  y += 6;
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  for (const row of metricRows) {
    doc.text(row.name, margin, y);
    doc.text(row.mob, margin + 230, y);
    doc.text(row.desk, margin + 330, y);
    doc.text(row.target, margin + 430, y);
    y += 15;
  }

  y += 8;

  // Real-World CrUX Field Data Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Real-World Visitor Experience (Chrome UX Report - 75th Percentile)", margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const mobileCrux = report.crux.MOBILE;
  if (mobileCrux && mobileCrux.dataScope !== "UNAVAILABLE") {
    doc.text(
      `Mobile Field Status: ${mobileCrux.overallStatus} (Scope: ${mobileCrux.dataScope}-level data)  |  LCP: ${mobileCrux.metrics.lcp.displayValue}  |  INP: ${mobileCrux.metrics.inp.displayValue}  |  CLS: ${mobileCrux.metrics.cls.displayValue}`,
      margin,
      y
    );
  } else {
    doc.text(
      "Not enough real-world visitor data is available in the Chrome UX Report for this page. Laboratory analysis above applies.",
      margin,
      y
    );
  }
  y += 22;

  // Top Optimization Opportunities
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Top Prioritized Optimization Opportunities", margin, y);
  y += 15;

  const primaryOpps =
    (report.runs.MOBILE?.opportunities?.length
      ? report.runs.MOBILE.opportunities
      : report.runs.DESKTOP?.opportunities) || [];

  if (primaryOpps.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("No major optimization bottlenecks were flagged in this scan.", margin, y);
    y += 20;
  } else {
    for (const opp of primaryOpps.slice(0, 5)) {
      if (y > 640) {
        doc.addPage();
        y = 48;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `• [${opp.priority} PRIORITY] ${opp.title} (${opp.category})`,
        margin,
        y
      );
      y += 13;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const explainLines = doc.splitTextToSize(
        `${opp.explanation} Recommended action: ${opp.recommendation}`,
        contentWidth - 12
      );
      doc.text(explainLines, margin + 10, y);
      y += explainLines.length * 12 + 8;
    }
  }

  if (y > 640) {
    doc.addPage();
    y = 48;
  }

  // Barking Otter CTA & Disclaimers Footer
  y += 6;
  doc.setFillColor(254, 243, 199); // Subtle warm amber tint
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(margin, y, contentWidth, 64, 6, 6, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("We Found the Problems. Barking Otter Can Fix Them.", margin + 14, y + 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    "Request your custom optimization plan at barkingotter.com or contact team@barkingotter.com.",
    margin + 14,
    y + 38
  );
  doc.text(
    `Online interactive report: barkingotter.com/audit/${report.id}`,
    margin + 14,
    y + 52
  );

  y += 80;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const disclaimer =
    "Measurement Disclaimer: Laboratory scores are captured via Google Lighthouse and can vary slightly between runs due to network routing and server load. Real-world Core Web Vitals reflect 28-day 75th-percentile Chrome UX Report field data when available. Optimization savings estimates from individual Lighthouse audits can overlap and are not a guaranteed additive total.";
  doc.text(doc.splitTextToSize(disclaimer, contentWidth), margin, y);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
