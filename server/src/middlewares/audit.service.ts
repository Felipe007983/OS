import { Request } from 'express';
import { prisma } from '../config/database.js';

interface AuditParams {
  req?: Request;
  companyId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
}

export async function logAudit({
  req,
  companyId,
  userId,
  action,
  entity,
  entityId,
  oldValues,
  newValues,
}: AuditParams) {
  try {
    const finalCompanyId = companyId || req?.user?.companyId;
    const finalUserId = userId || req?.user?.id;
    const ip = req ? (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1' : undefined;
    const userAgent = req ? req.headers['user-agent'] : undefined;

    await prisma.auditLog.create({
      data: {
        companyId: finalCompanyId,
        userId: finalUserId,
        action,
        entity,
        entityId: entityId || null,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        ipAddress: ip,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    console.error('[AUDIT ERROR] Falha ao registrar log de auditoria:', error);
  }
}
