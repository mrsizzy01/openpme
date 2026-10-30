import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { MobileMoneyService } from './mobile-money.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreatePaymentDto } from './payments.dto';

@ApiTags('Payments & Receipts')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private mobileMoneyService: MobileMoneyService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lister les paiements et reçus' })
  @ApiQuery({ name: 'invoiceId', required: false })
  async findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('invoiceId') invoiceId?: string,
  ) {
    return this.paymentsService.findAll(orgId, invoiceId);
  }

  @Post()
  @ApiOperation({ summary: 'Enregistrer un paiement avec lettrage automatique de la facture' })
  async createPayment(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(orgId, userId, body);
  }

  @Post('mobile-money/initiate')
  @ApiOperation({ summary: 'Initier un paiement Mobile Money STK Push (M-Pesa, Airtel, Orange)' })
  async initiateMobileMoney(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.mobileMoneyService.initiatePush(orgId, userId, body);
  }

  @Get('mobile-money/status/:ref')
  @ApiOperation({ summary: 'Vérifier le statut d\'une transaction Mobile Money' })
  async checkMobileMoneyStatus(@Param('ref') ref: string) {
    return this.mobileMoneyService.checkStatus(ref);
  }

  @Post('mobile-money/confirm')
  @ApiOperation({ summary: 'Confirmer et comptabiliser un paiement Mobile Money validé' })
  async confirmMobileMoney(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { reference: string; invoiceId?: string },
  ) {
    return this.mobileMoneyService.confirmMobileMoneyPayment(
      orgId,
      userId,
      body.reference,
      body.invoiceId,
    );
  }
}
