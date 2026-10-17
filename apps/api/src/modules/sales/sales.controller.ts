import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sales & Commercial')
@Controller('sales')
@UseGuards(JwtAuthGuard)
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
