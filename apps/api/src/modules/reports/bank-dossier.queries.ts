import {
  CashSessionStatus,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  SaleStatus,
} from '@prisma/client';

export interface BankDossierQueries {
  sales: Prisma.SaleWhereInput;
  payments: Prisma.PaymentWhereInput;
  expenses: Prisma.ExpenseWhereInput;
  cashSessions: Prisma.CashSessionWhereInput;
  paidInvoices: Prisma.InvoiceWhereInput;
}

export function buildBankDossierQueries(
  organizationId: string,
  startDate: Date,
  endDate: Date,
): BankDossierQueries {
  const dateRange = { gte: startDate, lte: endDate };
  return {
    sales: {
      organizationId,
      status: SaleStatus.COMPLETED,
      createdAt: dateRange,
    },
    payments: {
      organizationId,
      status: PaymentStatus.COMPLETED,
      createdAt: dateRange,
    },
    expenses: {
      organizationId,
      date: dateRange,
    },
    cashSessions: {
      organizationId,
      status: CashSessionStatus.CLOSED,
      closedAt: dateRange,
    },
    paidInvoices: {
      organizationId,
      status: InvoiceStatus.PAID,
      issueDate: dateRange,
    },
  };
}
