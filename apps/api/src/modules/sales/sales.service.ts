import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnomalyRuleType,
  AnomalySeverity,
  AnomalyStatus,
  CashMovementType,
  CashSessionStatus,
  Currency,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SaleStatus,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  convertAmount,
  currentExchangeRate,
  decimalAmount,
  roundAmount,
} from '../../common/money/decimal-money';
import { CreateSaleDto } from './sales.dto';

export function snapshotSaleUnitCost(
  purchasePrice: Prisma.Decimal,
  productCurrency: Currency,
  saleCurrency: Currency,
  exchangeRateUsdToCdf: Prisma.Decimal,
  isService: boolean,
): Prisma.Decimal | null {
  if (isService || purchasePrice.lte(0)) return null;
  return convertAmount(purchasePrice, productCurrency, saleCurrency, exchangeRateUsdToCdf);
}

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, limit = 50) {
    return this.prisma.sale.findMany({
      where: { organizationId },
      include: {
        customer: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: true } },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findById(organizationId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: true } },
        invoice: {
          include: { payments: true },
        },
      },
    });
    if (!sale) throw new NotFoundException('Vente non trouvée');
    return sale;
  }

  private async requireOpenCashSession(
    transaction: Prisma.TransactionClient,
    sessionId: string | undefined,
    organizationId: string,
    userId: string,
    currency: Currency,
  ) {
    if (!sessionId) {
      throw new BadRequestException(`Ouvrez une session de caisse ${currency} avant d’enregistrer le paiement.`);
    }
    const session = await transaction.cashSession.findFirst({
      where: {
        id: sessionId,
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
    return session.id;
  }

  async createSale(organizationId: string, userId: string, data: CreateSaleDto) {
    if (!data.items?.length) {
      throw new BadRequestException('Une vente doit contenir au moins un article.');
    }
    if (data.idempotencyKey) {
      const existing = await this.prisma.sale.findFirst({
        where: { organizationId, idempotencyKey: data.idempotencyKey },
        include: { items: { include: { product: true } }, customer: true },
      });
      if (existing) return { sale: existing, invoice: await this.prisma.invoice.findUnique({ where: { saleId: existing.id } }) };
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
      const orgSettings = await transaction.organizationSettings.findUnique({
        where: { organizationId },
      });
      if (!orgSettings) {
        throw new BadRequestException('Les paramètres de devise de l’entreprise ne sont pas configurés.');
      }

      const currency = data.currency ?? orgSettings.primaryCurrency;
      const exchangeRate = await currentExchangeRate(transaction, organizationId);
      const defaultWarehouse = await transaction.warehouse.findFirst({
        where: { organizationId, isDefault: true },
      });
      if (!defaultWarehouse) {
        throw new BadRequestException('Aucun dépôt de stockage par défaut configuré.');
      }

      if (data.customerId) {
        const customer = await transaction.customer.findFirst({
          where: { id: data.customerId, organizationId },
          select: { id: true },
        });
        if (!customer) throw new NotFoundException('Client introuvable dans cette entreprise.');
      }

      const itemsWithCalc: Array<{
        productId: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        taxRatePercent: Prisma.Decimal;
        gross: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        taxAmount: Prisma.Decimal;
        total: Prisma.Decimal;
        unitCost: Prisma.Decimal | null;
        product: {
          id: string;
          name: string;
          isService: boolean;
          currentStock: number;
          purchasePrice: Prisma.Decimal;
          currency: Currency;
        };
      }> = [];

      for (const item of data.items) {
        const product = await transaction.product.findFirst({
          where: { id: item.productId, organizationId, isActive: true },
          select: {
            id: true,
            name: true,
            purchasePrice: true,
            salePrice: true,
            currency: true,
            isService: true,
            currentStock: true,
          },
        });
        if (!product) throw new NotFoundException(`Produit ID ${item.productId} introuvable.`);

        const unitPrice = convertAmount(product.salePrice, product.currency, currency, exchangeRate);
        const unitCost = snapshotSaleUnitCost(
          product.purchasePrice,
          product.currency,
          currency,
          exchangeRate,
          product.isService,
        );
        const discountPercent = decimalAmount(item.discountPercent ?? 0, 'remise');
        if (discountPercent.isNegative() || discountPercent.gt(100)) {
          throw new BadRequestException('La remise doit être comprise entre 0 et 100 %.');
        }
        const taxRatePercent = orgSettings.enableTax
          ? decimalAmount(item.taxRatePercent ?? orgSettings.taxRatePercent, 'taux de TVA')
          : new Prisma.Decimal(0);
        if (taxRatePercent.isNegative() || taxRatePercent.gt(100)) {
          throw new BadRequestException('Le taux de TVA doit être compris entre 0 et 100 %.');
        }

        const quantity = item.quantity;
        const gross = roundAmount(unitPrice.mul(quantity), currency);
        const discountAmount = roundAmount(gross.mul(discountPercent).div(100), currency);
        const taxable = roundAmount(gross.minus(discountAmount), currency);
        const taxAmount = roundAmount(taxable.mul(taxRatePercent).div(100), currency);
        const total = roundAmount(taxable.plus(taxAmount), currency);
        itemsWithCalc.push({
          productId: product.id,
          quantity,
          unitPrice,
          discountPercent,
          taxRatePercent,
          gross,
          discountAmount,
          taxAmount,
          total,
          unitCost,
          product,
        });
      }

      const subtotal = itemsWithCalc.reduce((sum, item) => sum.plus(item.gross), new Prisma.Decimal(0));
      const discountAmount = itemsWithCalc.reduce((sum, item) => sum.plus(item.discountAmount), new Prisma.Decimal(0));
      const taxAmount = itemsWithCalc.reduce((sum, item) => sum.plus(item.taxAmount), new Prisma.Decimal(0));
      const total = itemsWithCalc.reduce((sum, item) => sum.plus(item.total), new Prisma.Decimal(0));
      const saleNumber = `VNT-${Date.now().toString().slice(-6)}`;
      const immediatePayment = data.immediatePayment ?? true;

      const salePayments = data.payments?.length
        ? data.payments
        : immediatePayment
          ? [{
            amount: total.toString(),
            currency,
            method: data.paymentMethod ?? PaymentMethod.CASH,
            reference: data.paymentReference,
            cashSessionId: data.cashSessionId,
          }]
          : [];

      const preparedPayments: Array<{
        amount: Prisma.Decimal;
        currency: Currency;
        method: PaymentMethod;
        reference?: string;
        cashSessionId?: string;
        appliedAmount: Prisma.Decimal;
      }> = [];
      let totalPaidInSaleCurrency = new Prisma.Decimal(0);
      let totalReceivedInCdf = new Prisma.Decimal(0);

      if (immediatePayment) {
        if (!salePayments.length) {
          throw new BadRequestException('Un paiement immédiat doit comporter au moins un règlement.');
        }
        for (const payment of salePayments) {
          const amount = roundAmount(decimalAmount(payment.amount, 'montant reçu'), payment.currency);
          if (amount.lte(0)) {
            throw new BadRequestException('Chaque montant reçu doit être supérieur à zéro.');
          }
          if (payment.method !== PaymentMethod.CASH && salePayments.length > 1) {
            throw new BadRequestException('Seul le paiement en espèces peut être réparti sur plusieurs devises.');
          }
          if (payment.method === PaymentMethod.CASH) {
            await this.requireOpenCashSession(
              transaction,
              payment.cashSessionId,
              organizationId,
              userId,
              payment.currency,
            );
          }
          const appliedInSaleCurrency = convertAmount(amount, payment.currency, currency, exchangeRate);
          totalPaidInSaleCurrency = totalPaidInSaleCurrency.plus(appliedInSaleCurrency);
          totalReceivedInCdf = totalReceivedInCdf.plus(
            convertAmount(amount, payment.currency, Currency.CDF, exchangeRate),
          );
          preparedPayments.push({
            amount,
            currency: payment.currency,
            method: payment.method,
            reference: payment.reference,
            cashSessionId: payment.cashSessionId,
            appliedAmount: new Prisma.Decimal(0),
          });
        }
        if (totalPaidInSaleCurrency.lt(total)) {
          throw new BadRequestException('Le montant reçu est inférieur au total de la vente.');
        }
        if (salePayments.some((payment) => payment.method !== PaymentMethod.CASH) && totalPaidInSaleCurrency.gt(total)) {
          throw new BadRequestException('Un paiement autre qu’en espèces doit correspondre exactement au total.');
        }
      }

      const changeAmountCdf = immediatePayment
        && salePayments.every((payment) => payment.method === PaymentMethod.CASH)
        ? roundAmount(
          totalReceivedInCdf.minus(convertAmount(total, currency, Currency.CDF, exchangeRate)),
          Currency.CDF,
        )
        : new Prisma.Decimal(0);

      if (changeAmountCdf.gt(0)) {
        const changeSessionId = data.changeCashSessionId
          ?? preparedPayments.find((payment) => payment.currency === Currency.CDF)?.cashSessionId;
        await this.requireOpenCashSession(
          transaction,
          changeSessionId,
          organizationId,
          userId,
          Currency.CDF,
        );
      }

      let remainingInvoiceAmount = total;
      for (const payment of preparedPayments) {
        const convertedAmount = convertAmount(payment.amount, payment.currency, currency, exchangeRate);
        payment.appliedAmount = Prisma.Decimal.min(remainingInvoiceAmount, convertedAmount);
        remainingInvoiceAmount = roundAmount(remainingInvoiceAmount.minus(payment.appliedAmount), currency);
      }

      for (const item of itemsWithCalc) {
        if (!item.product.isService) {
          const lockedStock = await transaction.$queryRaw<Array<{ currentStock: number }>>(Prisma.sql`
            SELECT "currentStock"
            FROM "products"
            WHERE "id" = ${item.product.id} AND "organizationId" = ${organizationId}
            FOR UPDATE
          `);
          const currentStock = lockedStock[0]?.currentStock;
          if (currentStock === undefined) {
            throw new NotFoundException(`Produit "${item.product.name}" introuvable dans cette entreprise.`);
          }
          const newStock = currentStock - item.quantity;
          if (newStock < 0) {
            await transaction.anomalyAlert.create({
              data: {
                organizationId,
                ruleType: AnomalyRuleType.NEGATIVE_STOCK,
                severity: AnomalySeverity.HIGH,
                status: AnomalyStatus.DETECTED,
                title: 'Stock négatif après tentative de vente',
                explanation: `Vente de ${item.quantity} unités de "${item.product.name}" alors que le stock disponible était de ${currentStock}.`,
                entityType: 'Product',
                entityId: item.product.id,
                observedValue: `${newStock} unités`,
                expectedThreshold: 'Stock >= 0',
              },
            });
          }

          await transaction.product.update({
            where: { id: item.product.id },
            data: { currentStock: newStock },
          });
          const warehouseStock = await transaction.warehouseStock.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: defaultWarehouse.id,
                productId: item.product.id,
              },
            },
          });
          if (warehouseStock) {
            await transaction.warehouseStock.update({
              where: { id: warehouseStock.id },
              data: { quantity: warehouseStock.quantity - item.quantity },
            });
          }
          await transaction.stockMovement.create({
            data: {
              organizationId,
              warehouseId: defaultWarehouse.id,
              productId: item.product.id,
              userId,
              type: StockMovementType.OUT_SALE,
              quantity: item.quantity,
              previousStock: currentStock,
              newStock,
              reference: saleNumber,
              reason: 'Vente directe client',
            },
          });
        }

        const maxDiscount = orgSettings.alertMaxDiscountPercent ?? new Prisma.Decimal(15);
        if (item.discountPercent.gt(maxDiscount)) {
          await transaction.anomalyAlert.create({
            data: {
              organizationId,
              ruleType: AnomalyRuleType.HIGH_DISCOUNT,
              severity: AnomalySeverity.MEDIUM,
              status: AnomalyStatus.DETECTED,
              title: 'Remise commerciale inhabituelle appliquée',
              explanation: `Une remise de ${item.discountPercent}% a été accordée sur l'article "${item.product.name}", dépassant le seuil d’alerte de ${maxDiscount}%.`,
              entityType: 'Sale',
              entityId: saleNumber,
              observedValue: `${item.discountPercent}%`,
              expectedThreshold: `Max: ${maxDiscount}%`,
            },
          });
        }
      }

      const sale = await transaction.sale.create({
        data: {
          organizationId,
          saleNumber,
          idempotencyKey: data.idempotencyKey,
          customerId: data.customerId || null,
          userId,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          currency,
          exchangeRateUsdToCdf: exchangeRate,
          changeAmountCdf,
          status: SaleStatus.COMPLETED,
          notes: data.notes,
          items: {
            create: itemsWithCalc.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: item.unitCost,
              discountPercent: item.discountPercent,
              taxRatePercent: item.taxRatePercent,
              total: item.total,
            })),
          },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      const nextInvoiceNumber = orgSettings.invoiceNextNumber || 1001;
      const invoicePrefix = orgSettings.invoicePrefix || 'FAC-';
      const invoiceNumber = `${invoicePrefix}${nextInvoiceNumber}`;
      const invoiceCustomerId = data.customerId
        || (await transaction.customer.findFirst({
          where: { organizationId, code: 'CLI-COMPTANT' },
          select: { id: true },
        }))?.id
        || null;

      const invoice = await transaction.invoice.create({
        data: {
          organizationId,
          invoiceNumber,
          type: InvoiceType.STANDARD,
          status: immediatePayment ? InvoiceStatus.PAID : InvoiceStatus.ISSUED,
          customerId: invoiceCustomerId,
          saleId: sale.id,
          dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          subtotal,
          discountAmount,
          taxAmount,
          total,
          paidAmount: immediatePayment ? total : new Prisma.Decimal(0),
          balance: immediatePayment ? new Prisma.Decimal(0) : total,
          currency,
          notes: data.notes,
          items: {
            create: itemsWithCalc.map((item) => ({
              productId: item.productId,
              description: `Article vente ${saleNumber}`,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              taxRatePercent: item.taxRatePercent,
              total: item.total,
            })),
          },
        },
      });

      await transaction.organizationSettings.update({
        where: { organizationId },
        data: { invoiceNextNumber: nextInvoiceNumber + 1 },
      });

      if (immediatePayment) {
        const receiptPrefix = orgSettings.receiptPrefix || 'REC-';
        for (const [index, payment] of preparedPayments.entries()) {
          const paymentNumber = `${receiptPrefix}${nextInvoiceNumber}${preparedPayments.length > 1 ? `-${index + 1}` : ''}`;
          await transaction.payment.create({
            data: {
              organizationId,
              paymentNumber,
              invoiceId: invoice.id,
              customerId: invoice.customerId,
              cashSessionId: payment.cashSessionId || null,
              userId,
              amount: payment.amount,
              currency: payment.currency,
              method: payment.method,
              exchangeRateUsdToCdf: exchangeRate,
              appliedAmount: payment.appliedAmount,
              reference: payment.reference || data.paymentReference || `ENCAISSEMENT-${saleNumber}`,
              status: PaymentStatus.COMPLETED,
              notes: 'Paiement direct à la vente',
            },
          });
        }
        if (changeAmountCdf.gt(0)) {
          const changeSessionId = data.changeCashSessionId
            ?? preparedPayments.find((payment) => payment.currency === Currency.CDF)?.cashSessionId;
          await transaction.cashMovement.create({
            data: {
              organizationId,
              cashSessionId: changeSessionId!,
              type: CashMovementType.OUT,
              amount: changeAmountCdf,
              reference: saleNumber,
              description: `Monnaie rendue au client pour la vente ${saleNumber}`,
            },
          });
        }
      }

      return { sale, invoice };
      });
    } catch (error) {
      if (data.idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.sale.findFirst({
          where: { organizationId, idempotencyKey: data.idempotencyKey },
          include: { items: { include: { product: true } }, customer: true },
        });
        if (existing) {
          return {
            sale: existing,
            invoice: await this.prisma.invoice.findUnique({ where: { saleId: existing.id } }),
          };
        }
      }
      throw error;
    }
  }
}
