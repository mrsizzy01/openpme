import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { Currency, Prisma } from '@prisma/client';
import {
  convertAmount,
  exchangeRateForStorage,
  roundAmount,
} from '../src/common/money/decimal-money';

describe('currency calculations', () => {
  it('rounds CDF to whole units and USD to cents using half-up rounding', () => {
    assert.equal(roundAmount(new Prisma.Decimal('12.5'), Currency.CDF).toFixed(0), '13');
    assert.equal(roundAmount(new Prisma.Decimal('12.345'), Currency.USD).toFixed(2), '12.35');
  });

  it('converts between CDF and USD without binary floating-point arithmetic', () => {
    const rate = exchangeRateForStorage('2850.1250');
    assert.equal(convertAmount(new Prisma.Decimal('2.50'), Currency.USD, Currency.CDF, rate).toFixed(0), '7125');
    assert.equal(convertAmount(new Prisma.Decimal('7125'), Currency.CDF, Currency.USD, rate).toFixed(2), '2.50');
  });

  it('rejects non-positive exchange rates', () => {
    assert.throws(() => exchangeRateForStorage('0'), BadRequestException);
    assert.throws(() => exchangeRateForStorage('-2'), BadRequestException);
  });
});
