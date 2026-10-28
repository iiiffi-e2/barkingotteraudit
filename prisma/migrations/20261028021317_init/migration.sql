-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('QUEUED', 'ANALYZING_MOBILE', 'ANALYZING_DESKTOP', 'REVIEWING_METRICS', 'IDENTIFYING_OPPORTUNITIES', 'PREPARING_REPORT', 'COMPLETED', 'PARTIAL', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('PUBLIC_WEB', 'HOMEPAGE_WIDGET', 'PUBLIC_RERUN', 'ADMIN_RERUN', 'API');

-- CreateEnum
CREATE TYPE "DeviceCategory" AS ENUM ('MOBILE', 'DESKTOP');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CruxDataScope" AS ENUM ('PAGE', 'ORIGIN', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "CruxOverallStatus" AS ENUM ('PASSED', 'FAILED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ComplexityBucket" AS ENUM ('STRAIGHTFORWARD', 'INVESTIGATION', 'COMPLEX');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'CONVERTED', 'CLOSED');

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "requestedUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "finalUrl" TEXT,
    "hostname" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'QUEUED',
    "source" "AuditSource" NOT NULL DEFAULT 'PUBLIC_WEB',
    "dedupeKey" TEXT,
    "cachedFromAuditId" TEXT,
    "detectedPlatform" TEXT,
    "platformSignals" JSONB,
    "isDemoMode" BOOLEAN NOT NULL DEFAULT false,
    "requesterIpHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditRun" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "device" "DeviceCategory" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "performanceScore" INTEGER,
    "accessibilityScore" INTEGER,
    "bestPracticesScore" INTEGER,
    "seoScore" INTEGER,
    "lighthouseVersion" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "requestedUrl" TEXT,
    "finalUrl" TEXT,
    "normalizedMetrics" JSONB,
    "warnings" JSONB,
    "runtimeError" JSONB,
    "configSettings" JSONB,
    "rawResultReference" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CruxSnapshot" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "device" "DeviceCategory" NOT NULL,
    "dataScope" "CruxDataScope" NOT NULL DEFAULT 'UNAVAILABLE',
    "sourceIdentifier" TEXT NOT NULL,
    "overallStatus" "CruxOverallStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "metricValues" JSONB NOT NULL,
    "collectionPeriod" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CruxSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "auditRunId" TEXT NOT NULL,
    "sourceAuditIds" JSONB NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "PriorityLevel" NOT NULL,
    "complexity" "ComplexityBucket" NOT NULL,
    "confidence" "ConfidenceLevel" NOT NULL,
    "explanation" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "technicalRecommendation" TEXT NOT NULL,
    "documentationUrl" TEXT,
    "evidence" JSONB NOT NULL,
    "estimatedSavings" JSONB NOT NULL,
    "impactScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "output" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "auditId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "websiteUrl" TEXT NOT NULL,
    "goalOrConcern" TEXT,
    "message" TEXT,
    "internalNotes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'OPTIMIZATION_PLAN',
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Audit_normalizedUrl_createdAt_idx" ON "Audit"("normalizedUrl", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Audit_hostname_createdAt_idx" ON "Audit"("hostname", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Audit_dedupeKey_status_createdAt_idx" ON "Audit"("dedupeKey", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Audit_status_createdAt_idx" ON "Audit"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditRun_auditId_idx" ON "AuditRun"("auditId");

-- CreateIndex
CREATE INDEX "AuditRun_performanceScore_idx" ON "AuditRun"("performanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "AuditRun_auditId_device_key" ON "AuditRun"("auditId", "device");

-- CreateIndex
CREATE INDEX "CruxSnapshot_auditId_idx" ON "CruxSnapshot"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "CruxSnapshot_auditId_device_key" ON "CruxSnapshot"("auditId", "device");

-- CreateIndex
CREATE INDEX "Opportunity_auditRunId_priority_impactScore_idx" ON "Opportunity"("auditRunId", "priority", "impactScore" DESC);

-- CreateIndex
CREATE INDEX "AIAnalysis_auditId_createdAt_idx" ON "AIAnalysis"("auditId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Lead_auditId_idx" ON "Lead"("auditId");

-- CreateIndex
CREATE INDEX "AuditEvent_auditId_createdAt_idx" ON "AuditEvent"("auditId", "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "AuditRun" ADD CONSTRAINT "AuditRun_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CruxSnapshot" ADD CONSTRAINT "CruxSnapshot_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "AuditRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
