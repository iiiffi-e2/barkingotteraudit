import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { LeadStatus, Prisma } from "@prisma/client";

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
    const status = searchParams.get("status")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") || "25")));

    const where: Prisma.LeadWhereInput = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { websiteUrl: { contains: q, mode: "insensitive" } },
      ];
    }

    if (status && status !== "ALL") {
      where.status = status as LeadStatus;
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          audit: {
            select: {
              id: true,
              hostname: true,
              runs: {
                select: {
                  device: true,
                  performanceScore: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const items = leads.map((lead) => ({
      id: lead.id,
      auditId: lead.auditId,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      websiteUrl: lead.websiteUrl,
      goalOrConcern: lead.goalOrConcern,
      message: lead.message,
      internalNotes: lead.internalNotes,
      source: lead.source,
      marketingConsent: lead.marketingConsent,
      status: lead.status,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      associatedAudit: lead.audit
        ? {
            id: lead.audit.id,
            hostname: lead.audit.hostname,
            mobileScore:
              lead.audit.runs.find((r) => r.device === "MOBILE")?.performanceScore ??
              null,
            desktopScore:
              lead.audit.runs.find((r) => r.device === "DESKTOP")?.performanceScore ??
              null,
          }
        : null,
    }));

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load leads." } },
      { status: 500 }
    );
  }
}
