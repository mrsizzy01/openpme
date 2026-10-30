import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Currency,
  PaymentMethod,
  CashSessionStatus,
  AnomalySeverity,
  AnomalyStatus,
  AnomalyRuleType,
  Prisma,
} from '@prisma/client';
import {
  convertAmount,
  currentExchangeRate,
  decimalAmount,
  roundAmount,
} from '../../common/money/decimal-money';
import { OpenCashSessionDto } from './cash-session.dto';
import { CreateExpenseDto } from './expense.dto';

@Injectable()
export class FinancesService {
  constructor(private prisma: PrismaService) {}

  // --- Expenses ---
  async listExpenses(organizationId: string) {
    return this.prisma.expense.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        financialAccount: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async createExpense(organizationId: string, userId: string, data: CreateExpenseDto) {
    if (data.idempotencyKey) {
      const existing = await this.prisma.expense.findFirst({
        where: { organizationId, idempotencyKey: data.idempotencyKey },
      });
      if (existing) return existing;
    }

    const currency = data.currency ?? Currency.CDF;
    const method = data.method ?? PaymentMethod.CASH;
    const amount = roundAmount(decimalAmount(data.amount), currency);
    if (amount.lte(0)) {
      throw new BadRequestException('Le montant de la dépense doit être supérieur à zéro.');
    }
    if (method === PaymentMethod.CASH && data.financialAccountId) {
      throw new BadRequestException('Une dépense en espèces doit être débitée de la session de caisse, pas d’un compte financier.');
    }

    const expenseNumber = `DEP-${Date.now().toString().slice(-6)}`;
    let expense;
    try {
      expense = await this.prisma.$transaction(async (tx) => {
      const exchangeRate = await currentExchangeRate(tx, organizationId);
      const orgSettings = await tx.organizationSettings.findUnique({
        where: { organizationId },
      });
      const alertThreshold = orgSettings?.alertLargeExpenseThreshold ?? new Prisma.Decimal(2000000);
      if (method === PaymentMethod.CASH) {
        if (!data.cashSessionId) {
          throw new BadRequestException(`Ouvrez une session de caisse ${currency} avant d’enregistrer cette dépense.`);
        }
        const session = await tx.cashSession.findFirst({
          where: {
            id: data.cashSessionId,
            organizationId,
            userId,
            currency,
            status: CashSessionStatus.OPEN,
          },
          select: { id: true },
        });
        if (!session) {
          throw new BadRequestException(`La session de caisse ${currency} est absente, clôturée ou ne vous appartient pas.`);
        }
      }

      if (data.financialAccountId) {
        const account = await tx.financialAccount.findFirst({
          where: { id: data.financialAccountId, organizationId, isActive: true },
          select: { id: true, currency: true },
        });
        if (!account) throw new NotFoundException('Compte financier introuvable.');
      }

      const exp = await tx.expense.create({
        data: {
          organizationId,
          expenseNumber,
          idempotencyKey: data.idempotencyKey,
          category: data.category || 'Frais Généraux',
          amount,
          currency,
          exchangeRateUsdToCdf: exchangeRate,
          beneficiary: data.beneficiary,
          method,
          reference: data.reference,
          notes: data.notes,
          userId,
          financialAccountId: data.financialAccountId || null,
        },
      });

      if (method === PaymentMethod.CASH) {
        await tx.cashMovement.create({
          data: {
            organizationId,
            cashSessionId: data.cashSessionId!,
            type: 'OUT',
            amount,
            reference: expenseNumber,
            description: `Dépense ${expenseNumber} - ${exp.category}`,
          },
        });
      }

      if (data.financialAccountId) {
        const account = await tx.financialAccount.findFirstOrThrow({
          where: { id: data.financialAccountId, organizationId, isActive: true },
          select: { id: true, currency: true },
        });
        const accountAmount = convertAmount(amount, currency, account.currency, exchangeRate);
        await tx.financialAccount.update({
          where: { id: data.financialAccountId },
          data: { balance: { decrement: accountAmount } },
        });
      }

      const alertThresholdInExpenseCurrency = convertAmount(
        alertThreshold,
        Currency.CDF,
        currency,
        exchangeRate,
      );
      if (amount.gte(alertThresholdInExpenseCurrency)) {
        await tx.anomalyAlert.create({
          data: {
            organizationId,
            ruleType: AnomalyRuleType.ABNORMAL_EXPENSE,
            severity: AnomalySeverity.HIGH,
            status: AnomalyStatus.DETECTED,
            title: 'Dépense exceptionnelle dépassant le seuil de contrôle',
            explanation: `Dépense N° ${expenseNumber} de ${amount} ${exp.currency} enregistrée pour "${exp.beneficiary}", supérieure au seuil d’alerte de ${alertThreshold} CDF.`,
            entityType: 'Expense',
            entityId: exp.id,
            observedValue: `${amount}`,
            expectedThreshold: `Seuil max: ${alertThreshold} CDF`,
          },
        });
      }

      return exp;
      });
    } catch (error) {
      if (data.idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.expense.findFirst({
          where: { organizationId, idempotencyKey: data.idempotencyKey },
        });
        if (existing) return existing;
      }
      throw error;
    }

    return expense;
  }

  // --- Cash Registers & Sessions ---
  async listCashRegisters(organizationId: string) {
    return this.prisma.cashRegister.findMany({
      where: { organizationId },
      include: {
        sessions: {
          where: { status: CashSessionStatus.OPEN },
          include: { user: true },
        },
      },
    });
  }

  async getCurrentSession(organizationId: string, userId: string, currency?: Currency) {
    if (currency && !Object.values(Currency).includes(currency)) {
      throw new BadRequestException('Devise de caisse non prise en charge.');
    }
    return this.prisma.cashSession.findFirst({
      where: {
        organizationId,
        userId,
        status: CashSessionStatus.OPEN,
        ...(currency ? { currency } : {}),
      },
      include: {
        cashRegister: true,
        payments: { where: { method: PaymentMethod.CASH, currency: currency ?? undefined } },
        movements: true,
      },
    });
  }

  async openSession(organizationId: string, userId: string, data: OpenCashSessionDto) {
    const currency = data.currency ?? Currency.CDF;
    const existing = await this.getCurrentSession(organizationId, userId, currency);
    if (existing) {
      throw new BadRequestException(`Vous avez déjà une session de caisse ${currency} active.`);
    }

    const openingBalance = roundAmount(decimalAmount(data.openingBalance, 'fond d’ouverture'), currency);
    if (openingBalance.lt(0)) {
      throw new BadRequestException('Le fond d’ouverture ne peut pas être négatif.');
    }
    const register = await this.prisma.cashRegister.findFirst({
      where: { id: data.cashRegisterId, organizationId },
      select: { id: true },
    });
    if (!register) throw new NotFoundException('Caisse introuvable dans cette entreprise.');

    return this.prisma.cashSession.create({
      data: {
        organizationId,
        cashRegisterId: register.id,
        userId,
        openingBalance,
        currency,
        status: CashSessionStatus.OPEN,
        notes: data.notes,
      },
      include: { cashRegister: true },
    });
  }

  async closeSession(
    organizationId: string,
    sessionId: string,
    closingCountedBalance: string | number,
    notes?: string,
  ) {
    const session = await this.prisma.cashSession.findFirst({
      where: { id: sessionId, organizationId },
      include: {
        movements: true,
      },
    });

    if (!session) throw new NotFoundException('Session de caisse non trouvée');
    if (session.status === CashSessionStatus.CLOSED) {
      throw new BadRequestException('Cette session est déjà clôturée.');
    }

    const orgSettings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    const cashPayments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        cashSessionId: session.id,
        method: PaymentMethod.CASH,
        currency: session.currency,
      },
      select: { amount: true },
    });
    const totalCashPayments = cashPayments.reduce((acc, payment) => acc.plus(payment.amount), new Prisma.Decimal(0));
    const movementTotal = session.movements.reduce(
      (acc, movement) => movement.type === 'IN' ? acc.plus(movement.amount) : acc.minus(movement.amount),
      new Prisma.Decimal(0),
    );
    const theoreticalBalance = roundAmount(
      session.openingBalance.plus(totalCashPayments).plus(movementTotal),
      session.currency,
    );
    const countedBalance = roundAmount(decimalAmount(closingCountedBalance, 'solde compté'), session.currency);
    if (countedBalance.lt(0)) {
      throw new BadRequestException('Le solde compté ne peut pas être négatif.');
    }
    const difference = roundAmount(countedBalance.minus(theoreticalBalance), session.currency);
    const discrepancyThresholdCdf = orgSettings?.alertCashDiscrepancyThreshold ?? new Prisma.Decimal(15000);
    const discrepancyThreshold = convertAmount(
      discrepancyThresholdCdf,
      Currency.CDF,
      session.currency,
      await currentExchangeRate(this.prisma, organizationId),
    );

    return this.prisma.$transaction(async (tx) => {
      const closed = await tx.cashSession.update({
        where: { id: sessionId },
        data: {
          closingBalance: countedBalance,
          theoreticalBalance,
          difference,
          status: CashSessionStatus.CLOSED,
          closedAt: new Date(),
          notes: notes || session.notes,
        },
      });

      // Anomaly: Cash discrepancy detected
      if (difference.abs().gt(discrepancyThreshold)) {
        await tx.anomalyAlert.create({
          data: {
            organizationId,
            ruleType: AnomalyRuleType.CASH_DISCREPANCY,
            severity: difference.abs().gt(discrepancyThreshold.mul(3)) ? AnomalySeverity.CRITICAL : AnomalySeverity.HIGH,
            status: AnomalyStatus.DETECTED,
            title: 'Écart de caisse significatif à la clôture',
            explanation: `Écart de ${difference} ${session.currency} (Compté: ${countedBalance}, Théorique: ${theoreticalBalance}), supérieur au seuil d’écart toléré de ${discrepancyThreshold}.`,
            entityType: 'CashSession',
            entityId: sessionId,
            observedValue: `${difference}`,
            expectedThreshold: `Tolérance: +/- ${discrepancyThreshold}`,
          },
        });
      }

      return closed;
    });
  }

  // --- Financial Accounts ---
  async listAccounts(organizationId: string) {
    return this.prisma.financialAccount.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
