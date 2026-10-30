import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FinancesService } from './finances.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CloseCashSessionDto, OpenCashSessionDto } from './cash-session.dto';
import { CreateExpenseDto } from './expense.dto';
import { Currency } from '@prisma/client';

@ApiTags('Finances & Cash Management')
@Controller('finances')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
@ApiBearerAuth()
export class FinancesController {
  constructor(private financesService: FinancesService) {}

  @Get('expenses')
  @ApiOperation({ summary: 'Lister les dépenses de l’entreprise' })
  async listExpenses(@CurrentUser('organizationId') orgId: string) {
    return this.financesService.listExpenses(orgId);
  }

  @Post('expenses')
  @ApiOperation({ summary: 'Enregistrer une dépense avec validation et contrôle de seuil' })
  async createExpense(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: CreateExpenseDto,
  ) {
    return this.financesService.createExpense(orgId, userId, body);
  }

  @Get('cash-registers')
  @ApiOperation({ summary: 'Lister les caisses physiques' })
  async listCashRegisters(@CurrentUser('organizationId') orgId: string) {
    return this.financesService.listCashRegisters(orgId);
  }

  @Get('cash-sessions/current')
  @ApiOperation({ summary: 'Obtenir la session de caisse en cours pour l’utilisateur' })
  async getCurrentSession(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Query('currency') currency?: Currency,
  ) {
    return this.financesService.getCurrentSession(orgId, userId, currency);
  }

  @Post('cash-sessions/open')
  @ApiOperation({ summary: 'Ouvrir une nouvelle session de caisse avec fond de roulement initial' })
  async openSession(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: OpenCashSessionDto,
  ) {
    return this.financesService.openSession(orgId, userId, body);
  }

  @Patch('cash-sessions/:id/close')
  @ApiOperation({ summary: 'Clôturer la session de caisse, calculer l’écart théorique vs réel et alerter' })
  async closeSession(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() body: CloseCashSessionDto,
  ) {
    return this.financesService.closeSession(orgId, id, body.closingCountedBalance, body.notes);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Lister les comptes bancaires et Mobile Money' })
  async listAccounts(@CurrentUser('organizationId') orgId: string) {
    return this.financesService.listAccounts(orgId);
  }
}
