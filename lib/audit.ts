import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

interface AuditLogInput {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: Prisma.InputJsonValue;
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        detailJson: input.detail ?? undefined,
      },
    });
  } catch {
    // Audit logging must never break the primary operation it's attached to.
  }
}
