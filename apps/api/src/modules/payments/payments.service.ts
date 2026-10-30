import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnomalyRuleType,
  AnomalySeverity,
  AnomalyStatus,
  CashSessionStatus,
  Currency,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  convertAmount,
  currentExchangeRate,
  decimalAmount,
  roundAmount,
} from '../../common/money/decimal-money';
import { CreatePaymentDto } from './payments.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, invoiceId?: string) {
    const where: Prisma.PaymentWhereInput = { organizationId };
    if (invoiceId) where.invoiceId = invoiceId;

    return this.prisma.payment.findMany({
      where,
      include: {
        invoice: true,
        customer: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        cashSession: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPayment(organizationId: string, userId: string, data: CreatePaymentDto) {
    const method = data.method ?? PaymentMethod.CASH;
    try {
      return await this.prisma.$transaction(async (transaction) => {
      if (data.idempotencyKey) {
        const existing = await transaction.payment.findFirst({
          where: { organizationId, idempotencyKey: data.idempotencyKey },
        });
        if (existing) return existing;
      }

      const invoice = data.invoiceId
        ? await transaction.invoice.findFirst({
          where: { id: data.invoiceId, organizationId },
        })
        : null;
      if (data.invoiceId && !invoice) throw new NotFoundException('Facture introuvable.');

      const currency = data.currency ?? invoice?.currency ?? Currency.CDF;
      const amount = roundAmount(decimalAmount(data.amount), currency);
      if (amount.lte(0)) {
        throw new BadRequestException('Le montant du paiement doit être supérieur à zéro.');
      }

      const exchangeRate = await currentExchangeRate(transaction, organizationId);
      const appliedAmount = invoice
        ? convertAmount(amount, currency, invoice.currency, exchangeRate)
        : amount;

      if (invoice) {
        if (invoice.balance.lte(0)) {
          throw new BadRequestException('Cette facture est déjà totalement soldée.');
        }
        if (appliedAmount.gt(invoice.balance)) {
          throw new BadRequestException(
            `Le paiement converti (${appliedAmount} ${invoice.currency}) dépasse le solde restant dû (${invoice.balance} ${invoice.currency}).`,
          );
        }
      }

      if (method === PaymentMethod.CASH) {
        if (!data.cashSessionId) {
          throw new BadRequestException(`Ouvrez une session de caisse ${currency} avant d’enregistrer le paiement.`);
        }
        const cashSession = await transaction.cashSession.findFirst({
          where: {
            id: data.cashSessionId,
            organizationId,
            userId,
            currency,
            status: CashSessionStatus.OPEN,
          },
          select: { id: true },
        });
        if (!cashSession) {
          throw new BadRequestException(`La session de caisse ${currency} est absente, clôturée ou ne vous appartient pas.`);
        }
      }

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const customerId = data.customerId || invoice?.customerId || null;
      const recentDup = await transaction.payment.findFirst({
        where: {
          organizationId,
          amount,
          currency,
          customerId,
          createdAt: { gte: tenMinutesAgo },
        },
      });

      if (recentDup) {
        await transaction.anomalyAlert.create({
          data: {
            organizationId,
            ruleType: AnomalyRuleType.DUPLICATE_PAYMENT,
            severity: AnomalySeverity.HIGH,
            status: AnomalyStatus.DETECTED,
            title: 'Suspicion de double encaissement',
            explanation: `Un paiement identique de ${amount} ${currency} a déjà été enregistré il y a moins de 10 minutes (Paiement N° ${recentDup.paymentNumber}).`,
            entityType: 'Payment',
            entityId: recentDup.paymentNumber,
            observedValue: `${amount} ${currency}`,
            expectedThreshold: 'Unicité des règlements rapprochés',
          },
        });
      }

      const nextNum = await transaction.payment.count({ where: { organizationId } });
      const receiptPrefix = (await transaction.organizationSettings.findUnique({
        where: { organizationId },
        select: { receiptPrefix: true },
      }))?.receiptPrefix || 'REC-';
      const paymentNumber = `${receiptPrefix}${String(nextNum + 1).padStart(6, '0')}`;

      const payment = await transaction.payment.create({
        data: {
          organizationId,
          paymentNumber,
          idempotencyKey: data.idempotencyKey,
          invoiceId: data.invoiceId || null,
          customerId,
          cashSessionId: method === PaymentMethod.CASH ? data.cashSessionId : null,
          userId,
          amount,
          currency,
          method,
          exchangeRateUsdToCdf: exchangeRate,
          appliedAmount,
          reference: data.reference,
          status: PaymentStatus.COMPLETED,
          notes: data.notes,
        },
      });

      if (invoice) {
        const newPaidAmount = roundAmount(invoice.paidAmount.plus(appliedAmount), invoice.currency);
        const newBalance = roundAmount(invoice.total.minus(newPaidAmount), invoice.currency);
        const newStatus = newBalance.lte(0) ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

        await transaction.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            balance: newBalance,
            status: newStatus,
          },
        });

        if (invoice.customerId) {
          const customer = await transaction.customer.findFirst({
            where: { id: invoice.customerId, organizationId },
            select: { currency: true },
          });
          if (customer) {
            const amountInCustomerCurrency = convertAmount(
              appliedAmount,
              invoice.currency,
              customer.currency,
              exchangeRate,
            );
            await transaction.customer.update({
              where: { id: invoice.customerId },
              data: {
                outstandingBalance: { decrement: amountInCustomerCurrency },
              },
            });
          }
        }
      }

      return payment;
      });
    } catch (error) {
      if (data.idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.payment.findFirst({
          where: { organizationId, idempotencyKey: data.idempotencyKey },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }
}
