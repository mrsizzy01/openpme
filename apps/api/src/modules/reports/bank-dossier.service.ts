import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  calculateBankDossier,
  createBankDossierPeriod,
} from './bank-dossier.calculations';
import { buildBankDossierPdf } from './bank-dossier.pdf';
import { buildBankDossierQueries } from './bank-dossier.queries';

@Injectable()
export class BankDossierService {
  constructor(private readonly prisma: PrismaService) {}

  async generatePdf(organizationId: string, months = 12): Promise<Buffer> {
    const { startDate, endDate } = createBankDossierPeriod(new Date(), months);
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        legalName: true,
        taxId: true,
        rccm: true,
        idNat: true,
        address: true,
        city: true,
      },
    });
    if (!organization) throw new NotFoundException('Entreprise introuvable pour générer le dossier.');

    const queries = buildBankDossierQueries(organizationId, startDate, endDate);
    const [sales, payments, expenses, cashSessions, paidInvoices] = await Promise.all([
      this.prisma.sale.findMany({
        where: queries.sales,
        select: {
          createdAt: true,
          currency: true,
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              unitCost: true,
              discountPercent: true,
              taxRatePercent: true,
            },
          },
        },
      }),
      this.prisma.payment.findMany({
        where: queries.payments,
        select: { createdAt: true, amount: true, currency: true },
      }),
      this.prisma.expense.findMany({
        where: queries.expenses,
        select: { date: true, amount: true, currency: true },
      }),
      this.prisma.cashSession.findMany({
        where: queries.cashSessions,
        select: { closedAt: true, difference: true, currency: true },
      }),
      this.prisma.invoice.findMany({
        where: queries.paidInvoices,
        select: {
          dueDate: true,
          payments: { select: { createdAt: true, status: true } },
        },
      }),
    ]);

    const totals = calculateBankDossier({
      startDate,
      endDate,
      sales,
      payments,
      expenses,
      cashSessions: cashSessions.flatMap((session) => session.closedAt
        ? [{ ...session, closedAt: session.closedAt }]
        : []),
      paidInvoices,
    });

    return buildBankDossierPdf(organization, totals, startDate, endDate);
  }
}
