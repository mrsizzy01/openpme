import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Lister les clients avec recherche' })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@CurrentUser('organizationId') orgId: string, @Query('search') search?: string) {
    return this.customersService.findAll(orgId, search);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Obtenir la fiche client avec son historique de facturation et paiements' })
  async findById(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
    return this.customersService.findById(orgId, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Créer un nouveau client' })
  async create(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
    return this.customersService.create(orgId, body);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Mettre à jour un client' })
  async update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.customersService.update(orgId, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Supprimer un client' })
  async remove(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.delete(orgId, id);
  }
}
