import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InvoiceStatus, UserRole } from '@prisma/client';

@ApiTags('Invoices & Billing')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les factures' })
  @ApiQuery({ name: 'status', enum: InvoiceStatus, required: false })
  async findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.invoicesService.findAll(orgId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir les détails complets d’une facture' })
  async findById(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
    return this.invoicesService.findById(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une facture avec numérotation automatique' })
  async createInvoice(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
    return this.invoicesService.createInvoice(orgId, body);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une facture avec justification' })
  async cancelInvoice(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.invoicesService.cancelInvoice(orgId, id, reason || 'Annulation manuelle');
  }
}
