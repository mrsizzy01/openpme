import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { roundMoney } from '@smart-pme/shared';
import { InvoiceStatus, InvoiceType, Currency } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, status?: InvoiceStatus) {
    const where: any = { organizationId };
    if (status) {
      where.status = status;
    }

    return this.prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        payments: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        sale: { include: { user: true } },
        items: { include: { product: true } },
        payments: {
          include: { user: true, cashSession: true },
          orderBy: { createdAt: 'desc' },
        },
        organization: {
          include: { settings: true },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Facture introuvable');
    return invoice;
  }

  async createInvoice(organizationId: string, data: any) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Une facture doit contenir des articles.');
    }

    const orgSettings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    const nextNum = orgSettings?.invoiceNextNumber || 1001;
    const prefix = orgSettings?.invoicePrefix || 'FAC-2026-';
    const invoiceNumber = `${prefix}${nextNum}`;

    const items = data.items.map((i: any) => {
      const qty = Math.max(1, parseInt(i.quantity, 10));
      const price = Math.max(0, parseFloat(i.unitPrice));
      const disc = Math.min(Math.max(0, parseFloat(i.discountPercent || 0)), 100);
      const taxRate = orgSettings?.enableTax ? parseFloat(i.taxRatePercent ?? orgSettings.taxRatePercent.toString()) : 0;

      const gross = roundMoney(qty * price);
      const discAmt = roundMoney(gross * (disc / 100));
      const taxable = roundMoney(gross - discAmt);
      const taxAmt = roundMoney(taxable * (taxRate / 100));
      const total = roundMoney(taxable + taxAmt);

      return {
        productId: i.productId || null,
        description: i.description || 'Prestation / Article',
        quantity: qty,
        unitPrice: price,
        discountPercent: disc,
        taxRatePercent: taxRate,
        gross,
        discAmt,
        taxAmt,
        total,
      };
    });

    const subtotal = roundMoney(items.reduce((acc, i) => acc + i.gross, 0));
    const discountAmount = roundMoney(items.reduce((acc, i) => acc + i.discAmt, 0));
    const taxAmount = roundMoney(items.reduce((acc, i) => acc + i.taxAmt, 0));
    const total = roundMoney(items.reduce((acc, i) => acc + i.total, 0));

    const currency = (data.currency as Currency) || orgSettings?.primaryCurrency || Currency.CDF;
    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 3600 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          invoiceNumber,
          type: (data.type as InvoiceType) || InvoiceType.STANDARD,
          status: InvoiceStatus.ISSUED,
          customerId: data.customerId,
          dueDate,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          paidAmount: 0,
          balance: total,
          currency,
          notes: data.notes,
          terms: data.terms || orgSettings?.invoiceFooterNote,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountPercent: i.discountPercent,
              taxRatePercent: i.taxRatePercent,
              total: i.total,
            })),
          },
        },
        include: { items: true, customer: true },
      });

      await tx.organizationSettings.update({
        where: { organizationId },
        data: { invoiceNextNumber: nextNum + 1 },
      });

      // Update customer outstanding balance
      await tx.customer.update({
        where: { id: data.customerId },
        data: {
          outstandingBalance: {
            increment: total,
          },
        },
      });

      return invoice;
    });
  }

  async cancelInvoice(organizationId: string, id: string, reason: string) {
    const inv = await this.findById(organizationId, id);

    if (inv.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Impossible d’annuler directement une facture déjà totalement payée. Émettre un avoir.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.CANCELLED,
          notes: `${inv.notes || ''} [ANNULÉE : ${reason}]`.trim(),
        },
      });

      // Recredit customer balance
      await tx.customer.update({
        where: { id: inv.customerId },
        data: {
          outstandingBalance: {
            decrement: Number(inv.balance),
          },
        },
      });

      // Journal d'audit de sécurité
      await tx.auditLog.create({
        data: {
          organizationId,
          action: 'CANCEL_INVOICE',
          entity: 'Invoice',
          entityId: id,
          oldValues: { invoiceNumber: inv.invoiceNumber, total: Number(inv.total), status: inv.status },
          newValues: { status: InvoiceStatus.CANCELLED, reason },
        },
      });

      return updated;
    });
  }
}
