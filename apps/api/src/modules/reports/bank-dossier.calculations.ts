import { BadRequestException } from '@nestjs/common';
import { Currency, PaymentStatus, Prisma } from '@prisma/client';
import { roundAmount } from '../../common/money/decimal-money';

export interface BankDossierSale {
  createdAt: Date;
  currency: Currency;
  items: Array<{
    quantity: number;
    unitPrice: Prisma.Decimal;
    unitCost: Prisma.Decimal | null;
    discountPercent: Prisma.Decimal;
  }>;
}

export interface BankDossierPayment {
  createdAt: Date;
  amount: Prisma.Decimal;
  currency: Currency;
}

export interface BankDossierExpense {
  date: Date;
  amount: Prisma.Decimal;
  currency: Currency;
}

export interface BankDossierCashSession {
  closedAt: Date;
  difference: Prisma.Decimal | null;
  currency: Currency;
}

export interface BankDossierInvoice {
  dueDate: Date;
  payments: Array<{ createdAt: Date; status: PaymentStatus }>;
}

export interface MonthlyCurrencyTotals {
  month: string;
  sales: Prisma.Decimal;
  grossMargin: Prisma.Decimal;
  marginCoveredSales: Prisma.Decimal;
  marginUnavailableSales: Prisma.Decimal;
  collections: Prisma.Decimal;
  expenses: Prisma.Decimal;
  netCashFlow: Prisma.Decimal;
  cashDifference: Prisma.Decimal;
}

export interface BankDossierTotals {
  months: Record<Currency, MonthlyCurrencyTotals[]>;
  paidInvoiceCount: number;
  invoicesPaidOnTime: number;
  invoicesPaidLate: number;
}

export interface BankDossierCalculationInput {
  startDate: Date;
  endDate: Date;
  sales: BankDossierSale[];
  payments: BankDossierPayment[];
  expenses: BankDossierExpense[];
  cashSessions: BankDossierCashSession[];
  paidInvoices: BankDossierInvoice[];
}

export function createBankDossierPeriod(now: Date, months: number) {
  if (months !== 6 && months !== 12) {
    throw new BadRequestException('La période du dossier doit être de 6 ou 12 mois.');
  }

  return {
    startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1)),
    endDate: now,
  };
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function listMonths(startDate: Date, endDate: Date): string[] {
  const months: string[] = [];
  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  const last = monthKey(endDate);

  while (monthKey(cursor) <= last) {
    months.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

function emptyMonth(month: string): MonthlyCurrencyTotals {
  return {
    month,
    sales: new Prisma.Decimal(0),
    grossMargin: new Prisma.Decimal(0),
    marginCoveredSales: new Prisma.Decimal(0),
    marginUnavailableSales: new Prisma.Decimal(0),
    collections: new Prisma.Decimal(0),
    expenses: new Prisma.Decimal(0),
    netCashFlow: new Prisma.Decimal(0),
    cashDifference: new Prisma.Decimal(0),
  };
}

function rowFor(
  months: Record<Currency, MonthlyCurrencyTotals[]>,
  currency: Currency,
  date: Date,
): MonthlyCurrencyTotals {
  const key = monthKey(date);
  const row = months[currency].find((candidate) => candidate.month === key);
  if (!row) {
    throw new RangeError(`La date ${key} est en dehors de la période du dossier.`);
  }
  return row;
}

export function calculateBankDossier(input: BankDossierCalculationInput): BankDossierTotals {
  const monthKeys = listMonths(input.startDate, input.endDate);
  const months: Record<Currency, MonthlyCurrencyTotals[]> = {
    [Currency.CDF]: monthKeys.map(emptyMonth),
    [Currency.USD]: monthKeys.map(emptyMonth),
  };

  for (const sale of input.sales) {
    const row = rowFor(months, sale.currency, sale.createdAt);
    for (const item of sale.items) {
      const gross = roundAmount(
        new Prisma.Decimal(item.quantity).mul(item.unitPrice),
        sale.currency,
      );
      const discount = roundAmount(
        gross.mul(item.discountPercent).div(100),
        sale.currency,
      );
      const revenue = roundAmount(gross.minus(discount), sale.currency);
      row.sales = row.sales.plus(revenue);

      if (item.unitCost === null) {
        row.marginUnavailableSales = row.marginUnavailableSales.plus(revenue);
        continue;
      }

      const cost = roundAmount(
        item.unitCost.mul(item.quantity),
        sale.currency,
      );
      row.marginCoveredSales = row.marginCoveredSales.plus(revenue);
      row.grossMargin = row.grossMargin.plus(revenue.minus(cost));
    }
  }

  for (const payment of input.payments) {
    const row = rowFor(months, payment.currency, payment.createdAt);
    row.collections = row.collections.plus(payment.amount);
  }

  for (const expense of input.expenses) {
    const row = rowFor(months, expense.currency, expense.date);
    row.expenses = row.expenses.plus(expense.amount);
  }

  for (const session of input.cashSessions) {
    if (session.difference) {
      const row = rowFor(months, session.currency, session.closedAt);
      row.cashDifference = row.cashDifference.plus(session.difference);
    }
  }

  for (const currency of [Currency.CDF, Currency.USD]) {
    for (const row of months[currency]) {
      row.sales = roundAmount(row.sales, currency);
      row.grossMargin = roundAmount(row.grossMargin, currency);
      row.marginCoveredSales = roundAmount(row.marginCoveredSales, currency);
      row.marginUnavailableSales = roundAmount(row.marginUnavailableSales, currency);
      row.collections = roundAmount(row.collections, currency);
      row.expenses = roundAmount(row.expenses, currency);
      row.netCashFlow = roundAmount(row.collections.minus(row.expenses), currency);
      row.cashDifference = roundAmount(row.cashDifference, currency);
    }
  }

  let paidInvoiceCount = 0;
  let invoicesPaidOnTime = 0;
  let invoicesPaidLate = 0;
  for (const invoice of input.paidInvoices) {
    const completedPayments = invoice.payments.filter((payment) => payment.status === PaymentStatus.COMPLETED);
    const lastPayment = completedPayments.reduce<Date | null>(
      (latest, payment) => latest === null || payment.createdAt > latest ? payment.createdAt : latest,
      null,
    );
    if (!lastPayment) continue;

    paidInvoiceCount++;
    if (lastPayment <= invoice.dueDate) invoicesPaidOnTime++;
    else invoicesPaidLate++;
  }

  return { months, paidInvoiceCount, invoicesPaidOnTime, invoicesPaidLate };
}
