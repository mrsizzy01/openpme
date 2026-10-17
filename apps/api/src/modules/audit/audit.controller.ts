import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Audit & Compliance')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Consulter le journal d’audit immuable de l’organisation' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'entity', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  async getAuditLogs(
    @CurrentUser('organizationId') orgId: string,
    @Query('limit') limit?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.listLogs(
      orgId,
      limit ? parseInt(limit, 10) : 100,
      entity,
      action
    );
  }
}
