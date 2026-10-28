import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/settings";
import {
  PageSpeedApiError,
  ParsedPageSpeedRun,
  runPageSpeedTest,
} from "@/lib/pagespeed";
import { fetchCruxSnapshot } from "@/lib/crux";
import { generateAIReportInterpretation } from "@/lib/ai-analysis";
import {
  AIReportInterpretation,
  NormalizedCruxSnapshot,
  NormalizedLabMetricsMap,
  NormalizedOpportunity,
  PublicAuditReport,
} from "@/types/audit";
import { AuditSource, Prisma } from "@prisma/client";
import { computeAuditDedupeKey } from "@/lib/url-validation";

const activeAuditPromises = new Map<string, Promise<void>>();

async function recordAuditEvent(
  auditId: string,
  eventType: string,
  eventData?: Record<string, unknown>
) {
  try {
    await prisma.auditEvent.create({
      data: {
        auditId,
        eventType,
        eventData: (eventData ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Non-fatal logging failure
  }
}

export async function createOrReuseCachedAudit(params: {
  requestedUrl: string;
  normalizedUrl: string;
  hostname: string;
  source?: AuditSource;
  requesterIpHash?: string;
  forceRerun?: boolean;
}): Promise<{ auditId: string; cached: boolean }> {
  const settings = await getAppSettings();
  const dedupeKey = computeAuditDedupeKey(
    params.normalizedUrl,
    Math.max(1, settings.cacheLifetimeHours)
  );

  if (!params.forceRerun && settings.cacheLifetimeHours > 0) {
    const cacheCutoff = new Date(
      Date.now() - settings.cacheLifetimeHours * 3600 * 1000
    );

    const existingCached = await prisma.audit.findFirst({
      where: {
        normalizedUrl: params.normalizedUrl,
        status: {
          in: [
            "COMPLETED",
            "QUEUED",
            "ANALYZING_MOBILE",
            "ANALYZING_DESKTOP",
            "REVIEWING_METRICS",
            "IDENTIFYING_OPPORTUNITIES",
            "PREPARING_REPORT",
          ],
        },
        createdAt: { gte: cacheCutoff },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingCached) {
      return {
        auditId: existingCached.id,
        cached: existingCached.status === "COMPLETED",
      };
    }
  }

  const expiresAt = new Date(
    Date.now() + settings.reportRetentionDays * 24 * 3600 * 1000
  );

  // Check if there was a previous completed audit for historical baseline tracking
  const previousBaseline = await prisma.audit.findFirst({
    where: {
      normalizedUrl: params.normalizedUrl,
      status: { in: ["COMPLETED", "PARTIAL"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const audit = await prisma.audit.create({
    data: {
      requestedUrl: params.requestedUrl,
      normalizedUrl: params.normalizedUrl,
      hostname: params.hostname,
      status: "QUEUED",
      source: params.source ?? "PUBLIC_WEB",
      dedupeKey,
      cachedFromAuditId: previousBaseline?.id ?? null,
      requesterIpHash: params.requesterIpHash ?? null,
      expiresAt,
      runs: {
        create: [{ device: "MOBILE" }, { device: "DESKTOP" }],
      },
    },
  });

  await recordAuditEvent(audit.id, "AUDIT_QUEUED", {
    normalizedUrl: params.normalizedUrl,
    message: "Preparing your analysis",
  });

  // Trigger durable background execution without blocking the HTTP response
  enqueueAuditExecution(audit.id);

  return { auditId: audit.id, cached: false };
}

export function enqueueAuditExecution(auditId: string): Promise<void> {
  const existing = activeAuditPromises.get(auditId);
  if (existing) return existing;

  const jobPromise = runAuditPipelineInternal(auditId)
    .catch(async (err) => {
      try {
        await prisma.audit.update({
          where: { id: auditId },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            errorCode: "INTERNAL_PIPELINE_ERROR",
            errorMessage:
              (err as Error)?.message ||
              "An unexpected error interrupted the performance analysis.",
          },
        });
      } catch {
        // ignore
      }
    })
    .finally(() => {
      activeAuditPromises.delete(auditId);
    });

  activeAuditPromises.set(auditId, jobPromise);
  return jobPromise;
}

export async function executeAuditPipeline(auditId: string): Promise<void> {
  return enqueueAuditExecution(auditId);
}

async function persistDeviceRunResult(
  auditId: string,
  device: "MOBILE" | "DESKTOP",
  parsed: ParsedPageSpeedRun
) {
  const runRecord = await prisma.auditRun.upsert({
    where: {
      auditId_device: {
        auditId,
        device,
      },
    },
    create: {
      auditId,
      device,
      status: "COMPLETED",
      performanceScore: parsed.performanceScore,
      accessibilityScore: parsed.accessibilityScore,
      bestPracticesScore: parsed.bestPracticesScore,
      seoScore: parsed.seoScore,
      lighthouseVersion: parsed.lighthouseVersion,
      fetchedAt: parsed.fetchedAt,
      requestedUrl: parsed.requestedUrl,
      finalUrl: parsed.finalUrl,
      normalizedMetrics: parsed.metrics as unknown as Prisma.InputJsonValue,
      warnings: parsed.warnings as unknown as Prisma.InputJsonValue,
      runtimeError: (parsed.runtimeError ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      configSettings: (parsed.configSettings ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      rawResultReference: `lh-${parsed.lighthouseVersion || "v12"}-${device.toLowerCase()}`,
    },
    update: {
      status: "COMPLETED",
      performanceScore: parsed.performanceScore,
      accessibilityScore: parsed.accessibilityScore,
      bestPracticesScore: parsed.bestPracticesScore,
      seoScore: parsed.seoScore,
      lighthouseVersion: parsed.lighthouseVersion,
      fetchedAt: parsed.fetchedAt,
      requestedUrl: parsed.requestedUrl,
      finalUrl: parsed.finalUrl,
      normalizedMetrics: parsed.metrics as unknown as Prisma.InputJsonValue,
      warnings: parsed.warnings as unknown as Prisma.InputJsonValue,
      runtimeError: (parsed.runtimeError ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      configSettings: (parsed.configSettings ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      rawResultReference: `lh-${parsed.lighthouseVersion || "v12"}-${device.toLowerCase()}`,
      errorMessage: null,
    },
  });

  // Replace opportunities for this run idempotently
  await prisma.opportunity.deleteMany({
    where: { auditRunId: runRecord.id },
  });

  if (parsed.opportunities.length > 0) {
    await prisma.opportunity.createMany({
      data: parsed.opportunities.map((opp) => ({
        auditRunId: runRecord.id,
        sourceAuditIds: opp.sourceAuditIds as unknown as Prisma.InputJsonValue,
        title: opp.title,
        originalTitle: opp.originalTitle,
        category: opp.category,
        priority: opp.priority,
        complexity: opp.complexity,
        confidence: opp.confidence,
        explanation: opp.explanation,
        whyItMatters: opp.whyItMatters,
        recommendation: opp.recommendation,
        technicalRecommendation: opp.technicalRecommendation,
        documentationUrl: opp.documentationUrl,
        evidence: opp.evidence as unknown as Prisma.InputJsonValue,
        estimatedSavings: opp.estimatedSavings as unknown as Prisma.InputJsonValue,
        impactScore: opp.impactScore,
      })),
    });
  }
}

async function runAuditPipelineInternal(auditId: string): Promise<void> {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
  });

  if (!audit) return;
  if (audit.status === "COMPLETED") return;

  const settings = await getAppSettings();
  const allowDemoFallback = settings.enableDemoFallbackInDev;

  // Stage 1 -> Stage 2: Checking mobile performance
  await prisma.audit.update({
    where: { id: auditId },
    data: {
      status: "ANALYZING_MOBILE",
      startedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    },
  });
  await prisma.auditRun.updateMany({
    where: { auditId, device: "MOBILE" },
    data: { status: "RUNNING" },
  });
  await recordAuditEvent(auditId, "ANALYZING_MOBILE", {
    message: "Checking mobile performance",
  });

  let mobileRun: ParsedPageSpeedRun | null = null;
  let mobileError: { code: string; message: string } | null = null;

  try {
    mobileRun = await runPageSpeedTest(audit.normalizedUrl, "MOBILE", {
      allowDemoFallback,
    });
    await persistDeviceRunResult(auditId, "MOBILE", mobileRun);
  } catch (err) {
    const code =
      err instanceof PageSpeedApiError ? err.code : "MOBILE_TEST_FAILED";
    const message =
      (err as Error)?.message || "Mobile performance analysis could not complete.";
    mobileError = { code, message };
    await prisma.auditRun.updateMany({
      where: { auditId, device: "MOBILE" },
      data: {
        status: "FAILED",
        errorMessage: message,
      },
    });
  }

  // If the target site is completely unreachable or blocked on the initial mobile check, fail fast instead of hanging
  if (
    mobileError &&
    (mobileError.code === "SITE_UNREACHABLE" ||
      mobileError.code === "BLOCKED_BY_SITE")
  ) {
    await prisma.auditRun.updateMany({
      where: { auditId, device: "DESKTOP" },
      data: {
        status: "FAILED",
        errorMessage: mobileError.message,
      },
    });
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorCode: mobileError.code,
        errorMessage: mobileError.message,
      },
    });
    await recordAuditEvent(auditId, "AUDIT_FAILED", {
      code: mobileError.code,
      message: mobileError.message,
    });
    return;
  }

  // Stage 3: Checking desktop performance
  await prisma.audit.update({
    where: { id: auditId },
    data: { status: "ANALYZING_DESKTOP" },
  });
  await prisma.auditRun.updateMany({
    where: { auditId, device: "DESKTOP" },
    data: { status: "RUNNING" },
  });
  await recordAuditEvent(auditId, "ANALYZING_DESKTOP", {
    message: "Checking desktop performance",
  });

  let desktopRun: ParsedPageSpeedRun | null = null;
  let desktopError: { code: string; message: string } | null = null;

  try {
    desktopRun = await runPageSpeedTest(audit.normalizedUrl, "DESKTOP", {
      allowDemoFallback,
    });
    await persistDeviceRunResult(auditId, "DESKTOP", desktopRun);
  } catch (err) {
    const code =
      err instanceof PageSpeedApiError ? err.code : "DESKTOP_TEST_FAILED";
    const message =
      (err as Error)?.message || "Desktop performance analysis could not complete.";
    desktopError = { code, message };
    await prisma.auditRun.updateMany({
      where: { auditId, device: "DESKTOP" },
      data: {
        status: "FAILED",
        errorMessage: message,
      },
    });
  }

  // If both mobile and desktop failed
  if (!mobileRun && !desktopRun) {
    const primaryErr = mobileError ||
      desktopError || {
        code: "ANALYSIS_FAILED",
        message: "Both mobile and desktop performance scans failed.",
      };
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorCode: primaryErr.code,
        errorMessage: primaryErr.message,
      },
    });
    await recordAuditEvent(auditId, "AUDIT_FAILED", primaryErr);
    return;
  }

  // Stage 4: Reviewing performance metrics & CrUX field data
  await prisma.audit.update({
    where: { id: auditId },
    data: { status: "REVIEWING_METRICS" },
  });
  await recordAuditEvent(auditId, "REVIEWING_METRICS", {
    message: "Reviewing performance metrics and Chrome UX Report field data",
  });

  const effectiveFinalUrl =
    mobileRun?.finalUrl || desktopRun?.finalUrl || audit.normalizedUrl;

  const [mobileCrux, desktopCrux] = await Promise.all([
    fetchCruxSnapshot(effectiveFinalUrl, "MOBILE", {
      enableOriginFallback: settings.enableOriginCruxFallback,
      allowDemoFallback,
    }),
    fetchCruxSnapshot(effectiveFinalUrl, "DESKTOP", {
      enableOriginFallback: settings.enableOriginCruxFallback,
      allowDemoFallback,
    }),
  ]);

  await Promise.all([
    prisma.cruxSnapshot.upsert({
      where: { auditId_device: { auditId, device: "MOBILE" } },
      create: {
        auditId,
        device: "MOBILE",
        dataScope: mobileCrux.dataScope,
        sourceIdentifier: mobileCrux.sourceIdentifier,
        overallStatus: mobileCrux.overallStatus,
        metricValues: mobileCrux.metrics as unknown as Prisma.InputJsonValue,
        collectionPeriod: (mobileCrux.collectionPeriod ??
          Prisma.JsonNull) as Prisma.InputJsonValue,
      },
      update: {
        dataScope: mobileCrux.dataScope,
        sourceIdentifier: mobileCrux.sourceIdentifier,
        overallStatus: mobileCrux.overallStatus,
        metricValues: mobileCrux.metrics as unknown as Prisma.InputJsonValue,
        collectionPeriod: (mobileCrux.collectionPeriod ??
          Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    }),
    prisma.cruxSnapshot.upsert({
      where: { auditId_device: { auditId, device: "DESKTOP" } },
      create: {
        auditId,
        device: "DESKTOP",
        dataScope: desktopCrux.dataScope,
        sourceIdentifier: desktopCrux.sourceIdentifier,
        overallStatus: desktopCrux.overallStatus,
        metricValues: desktopCrux.metrics as unknown as Prisma.InputJsonValue,
        collectionPeriod: (desktopCrux.collectionPeriod ??
          Prisma.JsonNull) as Prisma.InputJsonValue,
      },
      update: {
        dataScope: desktopCrux.dataScope,
        sourceIdentifier: desktopCrux.sourceIdentifier,
        overallStatus: desktopCrux.overallStatus,
        metricValues: desktopCrux.metrics as unknown as Prisma.InputJsonValue,
        collectionPeriod: (desktopCrux.collectionPeriod ??
          Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    }),
  ]);

  // Stage 5: Identifying optimization opportunities
  await prisma.audit.update({
    where: { id: auditId },
    data: { status: "IDENTIFYING_OPPORTUNITIES" },
  });
  await recordAuditEvent(auditId, "IDENTIFYING_OPPORTUNITIES", {
    message: "Identifying optimization opportunities",
  });

  // Stage 6: Preparing your report (AI / deterministic plain-English interpretation)
  await prisma.audit.update({
    where: { id: auditId },
    data: { status: "PREPARING_REPORT" },
  });
  await recordAuditEvent(auditId, "PREPARING_REPORT", {
    message: "Preparing your report",
  });

  const combinedOpportunities =
    mobileRun?.opportunities && mobileRun.opportunities.length > 0
      ? mobileRun.opportunities
      : desktopRun?.opportunities ?? [];

  const detectedPlatform =
    mobileRun?.detectedPlatform || desktopRun?.detectedPlatform || null;
  const platformSignals = Array.from(
    new Set([
      ...(mobileRun?.platformSignals ?? []),
      ...(desktopRun?.platformSignals ?? []),
    ])
  );

  const aiResult = await generateAIReportInterpretation(
    {
      hostname: audit.hostname,
      testedUrl: audit.normalizedUrl,
      mobileScore: mobileRun?.performanceScore ?? null,
      desktopScore: desktopRun?.performanceScore ?? null,
      mobileMetrics: mobileRun?.metrics ?? null,
      desktopMetrics: desktopRun?.metrics ?? null,
      mobileCrux,
      desktopCrux,
      topOpportunities: combinedOpportunities,
      detectedPlatform,
      warnings: [
        ...(mobileRun?.warnings ?? []),
        ...(desktopRun?.warnings ?? []),
      ],
      lighthouseVersion:
        mobileRun?.lighthouseVersion || desktopRun?.lighthouseVersion || null,
    },
    {
      enabled:
        settings.aiAnalysisEnabled && settings.aiProvider !== "deterministic",
      model: settings.aiModel,
    }
  );

  await prisma.aIAnalysis.create({
    data: {
      auditId,
      model: aiResult.model,
      promptVersion: aiResult.promptVersion,
      isFallback: aiResult.isFallback,
      output: aiResult.output as unknown as Prisma.InputJsonValue,
      status: aiResult.isFallback ? "FALLBACK" : "COMPLETED",
    },
  });

  const finalStatus =
    mobileRun && desktopRun ? "COMPLETED" : "PARTIAL";
  const partialErrorMessage =
    !mobileRun && mobileError
      ? `Mobile scan incomplete: ${mobileError.message}`
      : !desktopRun && desktopError
      ? `Desktop scan incomplete: ${desktopError.message}`
      : null;

  await prisma.audit.update({
    where: { id: auditId },
    data: {
      status: finalStatus,
      finalUrl: effectiveFinalUrl,
      detectedPlatform,
      platformSignals: platformSignals as unknown as Prisma.InputJsonValue,
      isDemoMode: Boolean(mobileRun?.isDemoMode || desktopRun?.isDemoMode),
      completedAt: new Date(),
      errorCode: finalStatus === "PARTIAL" ? "PARTIAL_DEVICE_FAILURE" : null,
      errorMessage: partialErrorMessage,
    },
  });

  await recordAuditEvent(auditId, "AUDIT_COMPLETED", {
    status: finalStatus,
    mobileScore: mobileRun?.performanceScore ?? null,
    desktopScore: desktopRun?.performanceScore ?? null,
    message: "Report ready",
  });
}

export async function getPublicAuditReportById(
  auditId: string
): Promise<PublicAuditReport | null> {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      runs: {
        include: {
          opportunities: {
            orderBy: { impactScore: "desc" },
          },
        },
      },
      cruxSnapshots: true,
      aiAnalyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      events: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!audit) return null;

  // Check if report has expired
  const isExpired =
    audit.expiresAt && audit.expiresAt.getTime() < Date.now();
  const effectiveStatus = isExpired ? "EXPIRED" : audit.status;

  // Check if job is stuck in an in-progress state for > 2 minutes without an active promise
  const isRunningStatus = [
    "QUEUED",
    "ANALYZING_MOBILE",
    "ANALYZING_DESKTOP",
    "REVIEWING_METRICS",
    "IDENTIFYING_OPPORTUNITIES",
    "PREPARING_REPORT",
  ].includes(effectiveStatus);

  if (
    isRunningStatus &&
    !activeAuditPromises.has(audit.id) &&
    Date.now() - audit.createdAt.getTime() > 5000
  ) {
    // Resume or recover stuck job asynchronously
    enqueueAuditExecution(audit.id);
  }

  // Retrieve previous audit comparison if available
  let previousAuditComparison: PublicAuditReport["previousAuditComparison"] =
    null;
  if (audit.cachedFromAuditId && audit.cachedFromAuditId !== audit.id) {
    const prev = await prisma.audit.findUnique({
      where: { id: audit.cachedFromAuditId },
      include: { runs: true },
    });
    if (prev) {
      const prevMob =
        prev.runs.find((r) => r.device === "MOBILE")?.performanceScore ?? null;
      const prevDesk =
        prev.runs.find((r) => r.device === "DESKTOP")?.performanceScore ?? null;
      const currMob =
        audit.runs.find((r) => r.device === "MOBILE")?.performanceScore ?? null;
      const currDesk =
        audit.runs.find((r) => r.device === "DESKTOP")?.performanceScore ?? null;

      previousAuditComparison = {
        previousAuditId: prev.id,
        previousDate: (prev.completedAt || prev.createdAt).toISOString(),
        previousMobileScore: prevMob,
        previousDesktopScore: prevDesk,
        mobileScoreDelta:
          currMob !== null && prevMob !== null ? currMob - prevMob : null,
        desktopScoreDelta:
          currDesk !== null && prevDesk !== null ? currDesk - prevDesk : null,
      };
    }
  }

  const formatRun = (device: "MOBILE" | "DESKTOP") => {
    const run = audit.runs.find((r) => r.device === device);
    if (!run) return null;

    const opportunities: NormalizedOpportunity[] = run.opportunities.map(
      (opp) => ({
        id: opp.id,
        sourceAuditIds: Array.isArray(opp.sourceAuditIds)
          ? (opp.sourceAuditIds as string[])
          : [],
        title: opp.title,
        originalTitle: opp.originalTitle,
        category: opp.category as NormalizedOpportunity["category"],
        priority: opp.priority,
        complexity: opp.complexity,
        confidence: opp.confidence,
        explanation: opp.explanation,
        whyItMatters: opp.whyItMatters,
        recommendation: opp.recommendation,
        technicalRecommendation: opp.technicalRecommendation,
        documentationUrl: opp.documentationUrl,
        evidence: (opp.evidence as unknown as NormalizedOpportunity["evidence"]) || {
          items: [],
        },
        estimatedSavings:
          (opp.estimatedSavings as unknown as NormalizedOpportunity["estimatedSavings"]) ||
          {},
        impactScore: opp.impactScore,
      })
    );

    return {
      status: run.status,
      performanceScore: run.performanceScore,
      accessibilityScore: run.accessibilityScore,
      bestPracticesScore: run.bestPracticesScore,
      seoScore: run.seoScore,
      lighthouseVersion: run.lighthouseVersion,
      fetchedAt: run.fetchedAt ? run.fetchedAt.toISOString() : null,
      finalUrl: run.finalUrl,
      metrics:
        (run.normalizedMetrics as unknown as NormalizedLabMetricsMap) || null,
      warnings: Array.isArray(run.warnings) ? (run.warnings as string[]) : [],
      errorMessage: run.errorMessage,
      opportunities,
    };
  };

  const formatCrux = (
    device: "MOBILE" | "DESKTOP"
  ): NormalizedCruxSnapshot | null => {
    const snap = audit.cruxSnapshots.find((c) => c.device === device);
    if (!snap) return null;
    return {
      device,
      dataScope: snap.dataScope,
      sourceIdentifier: snap.sourceIdentifier,
      overallStatus: snap.overallStatus,
      collectionPeriod:
        (snap.collectionPeriod as NormalizedCruxSnapshot["collectionPeriod"]) ||
        null,
      metrics: snap.metricValues as unknown as NormalizedCruxSnapshot["metrics"],
    };
  };

  const latestAi = audit.aiAnalyses[0];

  return {
    id: audit.id,
    requestedUrl: audit.requestedUrl,
    normalizedUrl: audit.normalizedUrl,
    finalUrl: audit.finalUrl,
    hostname: audit.hostname,
    status: effectiveStatus,
    source: audit.source,
    cachedFromAuditId: audit.cachedFromAuditId,
    detectedPlatform: audit.detectedPlatform,
    platformSignals: Array.isArray(audit.platformSignals)
      ? (audit.platformSignals as string[])
      : [],
    isDemoMode: audit.isDemoMode,
    createdAt: audit.createdAt.toISOString(),
    startedAt: audit.startedAt ? audit.startedAt.toISOString() : null,
    completedAt: audit.completedAt ? audit.completedAt.toISOString() : null,
    expiresAt: audit.expiresAt ? audit.expiresAt.toISOString() : null,
    errorCode: audit.errorCode,
    errorMessage: audit.errorMessage,
    previousAuditComparison,
    runs: {
      MOBILE: formatRun("MOBILE"),
      DESKTOP: formatRun("DESKTOP"),
    },
    crux: {
      MOBILE: formatCrux("MOBILE"),
      DESKTOP: formatCrux("DESKTOP"),
    },
    aiAnalysis: latestAi
      ? {
          model: latestAi.model,
          isFallback: latestAi.isFallback,
          output: latestAi.output as unknown as AIReportInterpretation,
        }
      : null,
    events: audit.events.map((e) => ({
      eventType: e.eventType,
      createdAt: e.createdAt.toISOString(),
      message:
        typeof (e.eventData as Record<string, unknown> | null)?.message ===
        "string"
          ? String((e.eventData as Record<string, unknown>).message)
          : undefined,
    })),
  };
}
