import { BadRequestException } from '@nestjs/common';
import { Currency, Prisma } from '@prisma/client';

type ExchangeRateClient = Pick<Prisma.TransactionClient, 'exchangeRate' | 'organizationSettings'>;

const CDF_DECIMAL_PLACES = 0;
const USD_DECIMAL_PLACES = 2;
const RATE_DECIMAL_PLACES = 4;

export function decimalAmount(value: string | number | Prisma.Decimal, field = 'montant'): Prisma.Decimal {
  try {
    const amount = new Prisma.Decimal(value);
    if (!amount.isFinite()) throw new Error();
    return amount;
  } catch {
    throw new BadRequestException(`Le champ ${field} doit être un nombre décimal valide.`);
  }
}

export function roundAmount(amount: Prisma.Decimal, currency: Currency): Prisma.Decimal {
  const places = currency === Currency.CDF ? CDF_DECIMAL_PLACES : USD_DECIMAL_PLACES;
  return amount.toDecimalPlaces(places, Prisma.Decimal.ROUND_HALF_UP);
}

export function convertAmount(
  amount: Prisma.Decimal,
  from: Currency,
  to: Currency,
  exchangeRateUsdToCdf: Prisma.Decimal,
): Prisma.Decimal {
  if (exchangeRateUsdToCdf.lte(0)) {
    throw new BadRequestException('Le taux de change USD/CDF doit être supérieur à zéro.');
  }
  if (from === to) return roundAmount(amount, to);
  if (from === Currency.USD && to === Currency.CDF) {
    return roundAmount(amount.mul(exchangeRateUsdToCdf), to);
  }
  return roundAmount(amount.div(exchangeRateUsdToCdf), to);
}

export function exchangeRateForStorage(value: string | number | Prisma.Decimal): Prisma.Decimal {
  const rate = decimalAmount(value, 'taux USD/CDF');
  if (rate.lte(0)) {
    throw new BadRequestException('Le taux de change USD/CDF doit être supérieur à zéro.');
  }
  return rate.toDecimalPlaces(RATE_DECIMAL_PLACES, Prisma.Decimal.ROUND_HALF_UP);
}

export async function currentExchangeRate(
  client: ExchangeRateClient,
  organizationId: string,
  now = new Date(),
): Promise<Prisma.Decimal> {
  const rateDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const historicalRate = await client.exchangeRate.findFirst({
    where: {
      organizationId,
      fromCurrency: Currency.USD,
      toCurrency: Currency.CDF,
      effectiveDate: { lte: rateDate },
    },
    orderBy: { effectiveDate: 'desc' },
  });
  if (historicalRate) return exchangeRateForStorage(historicalRate.rate);

  const settings = await client.organizationSettings.findUnique({
    where: { organizationId },
    select: { exchangeRateUsdToCdf: true },
  });
  if (!settings) {
    throw new BadRequestException('Aucun taux de change n’est configuré pour cette entreprise.');
  }
  return exchangeRateForStorage(settings.exchangeRateUsdToCdf);
}

export function todayUtcDate(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
