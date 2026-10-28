import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AuditStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Administrator authentication required." } },
      { status: 401 }
    );
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "";
    const scoreBand = searchParams.get("scoreBand")?.trim() || "";
    const days = Number(searchParams.get("days") || "0");
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") || "20")));

    const where: Prisma.AuditWhereInput = {};

    if (q) {
      where.OR = [
        { hostname: { contains: q, mode: "insensitive" } },
        { normalizedUrl: { contains: q, mode: "insensitive" } },
      ];
    }

    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter as AuditStatus;
    }

    if (days > 0) {
      where.createdAt = {
        gte: new Date(Date.now() - days * 24 * 3600 * 1000),
      };
    }

    if (scoreBand === "good") {
      where.runs = {
        some: { device: "MOBILE", performanceScore: { gte: 90 } },
      };
    } else if (scoreBand === "needs-improvement") {
      where.runs = {
        some: { device: "MOBILE", performanceScore: { gte: 50, lt: 90 } },
      };
    } else if (scoreBand === "poor") {
      where.runs = {
        some: { device: "MOBILE", performanceScore: { lt: 50 } },
      };
    }

    const orderBy: Prisma.AuditOrderByWithRelationInput =
      sort === "oldest"
        ? { createdAt: "asc" }
        : sort === "domain"
        ? { hostname: "asc" }
        : { createdAt: "desc" };

    const [total, audits] = await Promise.all([
      prisma.audit.count({ where }),
      prisma.audit.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          runs: {
            select: {
              device: true,
              status: true,
              performanceScore: true,
            },
          },
          _count: {
            select: { leads: true },
          },
        },
      }),
    ]);

    const items = audits.map((a) => {
      const mob = a.runs.find((r) => r.device === "MOBILE")?.performanceScore ?? null;
      const desk = a.runs.find((r) => r.device === "DESKTOP")?.performanceScore ?? null;
      return {
        id: a.id,
        hostname: a.hostname,
        normalizedUrl: a.normalizedUrl,
        status: a.status,
        source: a.source,
        mobileScore: mob,
        desktopScore: desk,
        leadsCount: a._count.leads,
        createdAt: a.createdAt.toISOString(),
        completedAt: a.completedAt ? a.completedAt.toISOString() : null,
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load audits list." } },
      { status: 500 }
    );
  }
}
