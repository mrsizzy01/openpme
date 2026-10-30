import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Currency, UserRole } from '@prisma/client';

@ApiTags('Dashboard & Supervision')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.AUDITOR)
@ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Obtenir les indicateurs de pilotage financier, commercial et de détection' })
  @ApiQuery({ name: 'currency', required: false, enum: Currency })
  async getMetrics(
    @CurrentUser('organizationId') orgId: string,
    @Query('currency') currency?: Currency,
  ) {
    return this.dashboardService.getMetrics(orgId, currency);
  }
}
