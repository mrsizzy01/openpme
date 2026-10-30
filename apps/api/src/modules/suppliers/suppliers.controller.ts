import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, Currency } from '@prisma/client';

@ApiTags('Suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.INVENTORY_MANAGER, UserRole.PURCHASER)
  @ApiOperation({ summary: 'Lister les fournisseurs avec recherche' })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@CurrentUser('organizationId') orgId: string, @Query('search') search?: string) {
    return this.suppliersService.findAll(orgId, search);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.INVENTORY_MANAGER, UserRole.PURCHASER)
  @ApiOperation({ summary: 'Obtenir la fiche fournisseur et historique' })
  async findById(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
    return this.suppliersService.findById(orgId, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.PURCHASER)
  @ApiOperation({ summary: 'Enregistrer un nouveau fournisseur' })
  async create(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: {
      name: string;
      contactPerson?: string;
      email?: string;
      phone?: string;
      address?: string;
      currency?: Currency;
      outstandingDebt?: number;
    },
  ) {
    return this.suppliersService.create(orgId, body);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.INVENTORY_MANAGER, UserRole.PURCHASER)
  @ApiOperation({ summary: 'Mettre à jour la fiche fournisseur' })
  async update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.suppliersService.update(orgId, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Désactiver un fournisseur' })
  async remove(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
    return this.suppliersService.delete(orgId, id);
  }
}
