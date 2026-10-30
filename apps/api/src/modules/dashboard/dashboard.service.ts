import { BadRequestException, Injectable } from '@nestjs/common';
import { AnomalyStatus, Currency, InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { convertAmount, currentExchangeRate, roundAmount } from '../../common/money/decimal-money';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(organizationId: string, requestedCurrency?: Currency) {
    const orgSettings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const primaryCurrency = orgSettings?.primaryCurrency || Currency.CDF;
    const displayCurrency = requestedCurrency || primaryCurrency;
    if (!Object.values(Currency).includes(displayCurrency)) {
      throw new BadRequestException('La devise d’affichage doit être CDF ou USD.');
    }
    const currentRate = await currentExchangeRate(this.prisma, organizationId);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const todaySales = await this.prisma.sale.findMany({
      where: { organizationId, createdAt: { gte: startOfToday } },
      select: { total: true, currency: true, exchangeRateUsdToCdf: true },
    });
    const todaySalesTotal = roundAmount(
      todaySales.reduce(
        (sum, sale) => sum.plus(convertAmount(sale.total, sale.currency, displayCurrency, sale.exchangeRateUsdToCdf)),
        new Prisma.Decimal(0),
      ),
      displayCurrency,
    );

    const monthlySales = await this.prisma.sale.findMany({
      where: { organizationId, createdAt: { gte: startOfMonth } },
      select: { total: true, currency: true, exchangeRateUsdToCdf: true },
    });
    const monthlyRevenue = roundAmount(
      monthlySales.reduce(
        (sum, sale) => sum.plus(convertAmount(sale.total, sale.currency, displayCurrency, sale.exchangeRateUsdToCdf)),
        new Prisma.Decimal(0),
      ),
      displayCurrency,
    );

    const monthlyExpensesList = await this.prisma.expense.findMany({
      where: { organizationId, date: { gte: startOfMonth } },
      select: { amount: true, currency: true, exchangeRateUsdToCdf: true },
    });
    const monthlyExpenses = roundAmount(
      monthlyExpensesList.reduce(
        (sum, expense) => sum.plus(
          convertAmount(expense.amount, expense.currency, displayCurrency, expense.exchangeRateUsdToCdf),
        ),
        new Prisma.Decimal(0),
      ),
      displayCurrency,
    );
    const netMargin = roundAmount(monthlyRevenue.minus(monthlyExpenses), displayCurrency);

    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
      },
      include: { sale: { select: { exchangeRateUsdToCdf: true } } },
    });
    const totalReceivables = roundAmount(
      unpaidInvoices.reduce(
        (sum, invoice) => sum.plus(convertAmount(
          invoice.balance,
          invoice.currency,
          displayCurrency,
          invoice.sale?.exchangeRateUsdToCdf ?? currentRate,
        )),
        new Prisma.Decimal(0),
      ),
      displayCurrency,
    );

    const suppliers = await this.prisma.supplier.findMany({
      where: { organizationId },
      select: { outstandingDebt: true, currency: true },
    });
    const totalPayables = roundAmount(
      suppliers.reduce(
        (sum, supplier) => sum.plus(
          convertAmount(supplier.outstandingDebt, supplier.currency, displayCurrency, currentRate),
        ),
        new Prisma.Decimal(0),
      ),
      displayCurrency,
    );

    const bankAccounts = await this.prisma.financialAccount.findMany({
      where: { organizationId, isActive: true },
      select: { balance: true, currency: true },
    });
    const accountBalance = bankAccounts.reduce(
      (sum, account) => sum.plus(
        convertAmount(account.balance, account.currency, displayCurrency, currentRate),
      ),
      new Prisma.Decimal(0),
    );
    const openCashSessions = await this.prisma.cashSession.findMany({
      where: { organizationId, status: 'OPEN' },
      include: {
        payments: {
          where: { method: 'CASH' },
          select: { amount: true },
        },
        movements: true,
      },
    });
    const cashBalance = openCashSessions.reduce((sum, session) => {
      const payments = session.payments.reduce(
        (total, payment) => total.plus(payment.amount),
        new Prisma.Decimal(0),
      );
      const movements = session.movements.reduce(
        (total, movement) => movement.type === 'IN'
          ? total.plus(movement.amount)
          : total.minus(movement.amount),
        new Prisma.Decimal(0),
      );
      const localBalance = session.openingBalance.plus(payments).plus(movements);
      return sum.plus(convertAmount(localBalance, session.currency, displayCurrency, currentRate));
    }, new Prisma.Decimal(0));
    const totalCashBalance = roundAmount(
      accountBalance.plus(cashBalance),
      displayCurrency,
    );

    const allProducts = await this.prisma.product.findMany({
      where: { organizationId, isService: false, isActive: true },
      select: { currentStock: true, minStockLevel: true },
    });
    const lowStockItemsCount = allProducts.filter((product) => product.currentStock <= product.minStockLevel).length;
    const activeAnomaliesCount = await this.prisma.anomalyAlert.count({
      where: {
        organizationId,
        status: { in: [AnomalyStatus.DETECTED, AnomalyStatus.UNDER_REVIEW] },
      },
    });

    const recentSales = await this.prisma.sale.findMany({
      where: { organizationId },
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const recentInvoices = await this.prisma.invoice.findMany({
      where: { organizationId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const recentAnomalies = await this.prisma.anomalyAlert.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      metrics: {
        todaySales: todaySalesTotal.toNumber(),
        todaySalesCount: todaySales.length,
        monthlyRevenue: monthlyRevenue.toNumber(),
        monthlyExpenses: monthlyExpenses.toNumber(),
        netMargin: netMargin.toNumber(),
        totalReceivables: totalReceivables.toNumber(),
        totalPayables: totalPayables.toNumber(),
        totalCashBalance: totalCashBalance.toNumber(),
        primaryCurrency,
        displayCurrency,
        exchangeRateUsdToCdf: currentRate.toNumber(),
        lowStockItemsCount,
        activeAnomaliesCount,
        unpaidInvoicesCount: unpaidInvoices.length,
      },
      recentSales,
      recentInvoices,
      recentAnomalies,
    };
  }
}
