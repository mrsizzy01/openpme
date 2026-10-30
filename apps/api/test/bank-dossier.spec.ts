import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { Currency, PaymentStatus, Prisma, UserRole } from '@prisma/client';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { calculateBankDossier, createBankDossierPeriod } from '../src/modules/reports/bank-dossier.calculations';
import { BankDossierController } from '../src/modules/reports/bank-dossier.controller';
import { BankDossierQueryDto } from '../src/modules/reports/bank-dossier.dto';
import { buildBankDossierPdf } from '../src/modules/reports/bank-dossier.pdf';
import { buildBankDossierQueries } from '../src/modules/reports/bank-dossier.queries';
import { snapshotSaleUnitCost } from '../src/modules/sales/sales.service';

const decimal = (value: string) => new Prisma.Decimal(value);

describe('bank dossier report', () => {
  it('creates a 6- or 12-calendar-month period and rejects unsupported ranges', () => {
    const now = new Date('2026-10-29T15:00:00.000Z');
    assert.equal(createBankDossierPeriod(now, 6).startDate.toISOString(), '2026-05-01T00:00:00.000Z');
    assert.equal(createBankDossierPeriod(now, 12).startDate.toISOString(), '2025-11-01T00:00:00.000Z');
    assert.throws(() => createBankDossierPeriod(now, 3), BadRequestException);
  });

  it('snapshots product costs in the sale currency and leaves unknown costs unavailable', () => {
    const rate = decimal('2000');
    assert.equal(
      snapshotSaleUnitCost(decimal('5000'), Currency.CDF, Currency.USD, rate, false)?.toFixed(2),
      '2.50',
    );
    assert.equal(snapshotSaleUnitCost(decimal('0'), Currency.CDF, Currency.USD, rate, false), null);
    assert.equal(snapshotSaleUnitCost(decimal('5000'), Currency.CDF, Currency.USD, rate, true), null);
  });

  it('calculates margin only for costed sales and keeps CDF and USD separate', () => {
    const totals = calculateBankDossier({
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      sales: [
        {
          createdAt: new Date('2026-12-05T10:00:00.000Z'),
          currency: Currency.CDF,
          items: [{
            quantity: 2,
            unitPrice: decimal('1000'),
            unitCost: decimal('600'),
            discountPercent: decimal('10'),
          }],
        },
        {
          createdAt: new Date('2026-12-08T10:00:00.000Z'),
          currency: Currency.CDF,
          items: [{
            quantity: 1,
            unitPrice: decimal('1000'),
            unitCost: null,
            discountPercent: decimal('0'),
          }],
        },
        {
          createdAt: new Date('2026-12-10T10:00:00.000Z'),
          currency: Currency.USD,
          items: [{
            quantity: 2,
            unitPrice: decimal('20'),
            unitCost: decimal('12'),
            discountPercent: decimal('0'),
          }],
        },
      ],
      payments: [
        { createdAt: new Date('2026-12-10T10:00:00.000Z'), amount: decimal('2500'), currency: Currency.CDF },
        { createdAt: new Date('2026-12-11T10:00:00.000Z'), amount: decimal('40'), currency: Currency.USD },
      ],
      expenses: [
        { date: new Date('2026-12-15T10:00:00.000Z'), amount: decimal('600'), currency: Currency.CDF },
        { date: new Date('2026-12-16T10:00:00.000Z'), amount: decimal('5'), currency: Currency.USD },
      ],
      cashSessions: [{
        closedAt: new Date('2026-12-20T10:00:00.000Z'),
        difference: decimal('-5'),
        currency: Currency.CDF,
      }],
      paidInvoices: [
        {
          dueDate: new Date('2026-12-12T00:00:00.000Z'),
          payments: [{ createdAt: new Date('2026-12-11T00:00:00.000Z'), status: PaymentStatus.COMPLETED }],
        },
        {
          dueDate: new Date('2026-12-12T00:00:00.000Z'),
          payments: [
            { createdAt: new Date('2026-12-10T00:00:00.000Z'), status: PaymentStatus.COMPLETED },
            { createdAt: new Date('2026-12-13T00:00:00.000Z'), status: PaymentStatus.COMPLETED },
          ],
        },
      ],
    });

    const cdf = totals.months[Currency.CDF][5];
    const usd = totals.months[Currency.USD][5];
    assert.equal(cdf.sales.toFixed(0), '2800');
    assert.equal(cdf.grossMargin.toFixed(0), '600');
    assert.equal(cdf.marginCoveredSales.toFixed(0), '1800');
    assert.equal(cdf.marginUnavailableSales.toFixed(0), '1000');
    assert.equal(cdf.netCashFlow.toFixed(0), '1900');
    assert.equal(cdf.cashDifference.toFixed(0), '-5');
    assert.equal(usd.sales.toFixed(2), '40.00');
    assert.equal(usd.grossMargin.toFixed(2), '16.00');
    assert.equal(usd.netCashFlow.toFixed(2), '35.00');
    assert.equal(totals.invoicesPaidOnTime, 1);
    assert.equal(totals.invoicesPaidLate, 1);
  });

  it('scopes every report query to the authenticated organization and date range', () => {
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-12-31T23:59:59.000Z');
    const queries = buildBankDossierQueries('org-current', startDate, endDate);

    for (const where of Object.values(queries)) {
      assert.equal(where.organizationId, 'org-current');
    }
    assert.deepEqual(queries.sales.createdAt, { gte: startDate, lte: endDate });
    assert.deepEqual(queries.paidInvoices.issueDate, { gte: startDate, lte: endDate });
  });

  it('validates the requested period and limits access to finance roles', async () => {
    const valid = plainToInstance(BankDossierQueryDto, { months: '6' });
    const invalid = plainToInstance(BankDossierQueryDto, { months: '8' });
    assert.equal((await validate(valid)).length, 0);
    assert.ok((await validate(invalid)).some((error) => error.property === 'months'));

    const roles = Reflect.getMetadata(ROLES_KEY, BankDossierController) as UserRole[];
    assert.ok(roles.includes(UserRole.MANAGER));
    assert.ok(roles.includes(UserRole.ACCOUNTANT));
    assert.ok(!roles.includes(UserRole.CASHIER));
  });

  it('generates a valid PDF document', async () => {
    const startDate = new Date('2026-07-01T00:00:00.000Z');
    const endDate = new Date('2026-12-31T23:59:59.000Z');
    const totals = calculateBankDossier({
      startDate,
      endDate,
      sales: [],
      payments: [],
      expenses: [],
      cashSessions: [],
      paidInvoices: [],
    });
    const pdf = await buildBankDossierPdf({
      name: 'Entreprise de test',
      legalName: null,
      taxId: null,
      rccm: null,
      idNat: null,
      address: null,
      city: null,
    }, totals, startDate, endDate);

    assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
    assert.ok(pdf.length > 1000);
  });
});
