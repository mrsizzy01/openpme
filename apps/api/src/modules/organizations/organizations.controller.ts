import { Body, Controller, Get, Patch, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { UpdateOrganizationSettingsDto } from './organization-settings.dto';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Get('profile')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Obtenir les données de l’entreprise courante' })
  async getProfile(@CurrentUser('organizationId') orgId: string) {
    return this.orgsService.getProfile(orgId);
  }

  @Patch('profile')
  @Roles(UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Mettre à jour les informations de l’entreprise' })
  async updateProfile(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
    return this.orgsService.updateProfile(orgId, body);
  }

  @Put('settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Mettre à jour les paramètres de l’entreprise (taxes, devises, alertes)' })
  async updateSettings(@CurrentUser('organizationId') orgId: string, @Body() body: UpdateOrganizationSettingsDto) {
    return this.orgsService.updateSettings(orgId, body);
  }

  @Get('exchange-rates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Consulter l’historique journalier des taux USD/CDF de l’entreprise' })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  async listExchangeRates(
    @CurrentUser('organizationId') orgId: string,
    @Query('limit') limit?: string,
  ) {
    return this.orgsService.listExchangeRates(orgId, limit ? Number.parseInt(limit, 10) : 100);
  }

  @Get('users')
  @Roles(UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les utilisateurs de l’entreprise' })
  async listUsers(@CurrentUser('organizationId') orgId: string) {
    return this.orgsService.listUsers(orgId);
  }
}
