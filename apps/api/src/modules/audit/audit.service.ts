import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async listLogs(
    organizationId: string,
    limit: number = 100,
    entity?: string,
    action?: string
  ) {
    const where: any = { organizationId };
    if (entity) where.entity = entity;
    if (action) where.action = action;

    return this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  async log(data: {
    organizationId: string;
    userId?: string | null;
    action: string;
    entity: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          organizationId: data.organizationId,
          userId: data.userId || null,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          oldValues: data.oldValues ? JSON.parse(JSON.stringify(data.oldValues)) : undefined,
          newValues: data.newValues ? JSON.parse(JSON.stringify(data.newValues)) : undefined,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });
    } catch (e) {
      // Non-blocking in case of error
      console.error('AuditLog Error:', e);
      return null;
    }
  }
}
