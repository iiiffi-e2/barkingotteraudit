import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

const UpdateLeadSchema = z.object({
  status: z
    .enum([
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "PROPOSAL_SENT",
      "CONVERTED",
      "CLOSED",
    ])
    .optional(),
  internalNotes: z.string().max(4000).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Administrator authentication required." } },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = UpdateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid update payload.",
          },
        },
        { status: 400 }
      );
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.internalNotes !== undefined
          ? { internalNotes: parsed.data.internalNotes }
          : {}),
      },
    });

    return NextResponse.json({
      lead: {
        id: updated.id,
        status: updated.status,
        internalNotes: updated.internalNotes,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update lead." } },
      { status: 500 }
    );
  }
}
