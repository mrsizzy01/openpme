import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateSaleDto } from './sales.dto';

@ApiTags('Sales & Commercial')
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.SALES_REP)
@ApiBearerAuth()
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les ventes avec pagination et relations' })
  async findAll(@CurrentUser('organizationId') orgId: string, @Query('limit') limit?: string) {
    return this.salesService.findAll(orgId, limit ? parseInt(limit, 10) : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir le détail d’une vente' })
  async findById(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
    return this.salesService.findById(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Enregistrer une nouvelle vente avec décompte de stock, facturation et audit' })
  async createSale(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: CreateSaleDto,
  ) {
    return this.salesService.createSale(orgId, userId, body);
  }
}
