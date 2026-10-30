import { Currency } from './enums';
import Decimal from 'decimal.js';

export function roundMoney(amount: number | string, decimals: number = 2): number {
  return new Decimal(amount.toString())
    .toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP)
    .toNumber();
}

export function sumMoney(amounts: Array<number | string>, decimals: number = 2): number {
  const sum = amounts.reduce(
    (total, amount) => total.plus(amount.toString()),
    new Decimal(0),
  );
  return sum.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber();
}

export function subtractMoney(left: number | string, right: number | string, decimals: number = 2): number {
  return new Decimal(left.toString())
    .minus(right.toString())
    .toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP)
    .toNumber();
}

export function convertCurrency(
  amount: number | string,
  from: Currency,
  to: Currency,
  exchangeRateUsdToCdf: number = 2850
): number {
  const decimalAmount = new Decimal(amount.toString());
  const rate = new Decimal(exchangeRateUsdToCdf.toString());
  if (from === to) return decimalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  if (rate.lte(0)) throw new RangeError('Le taux de change doit être positif.');
  if (from === Currency.USD && to === Currency.CDF) {
    return decimalAmount.mul(rate).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  }
  if (from === Currency.CDF && to === Currency.USD) {
    return decimalAmount.div(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }
  return decimalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export interface LineCalculationResult {
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export function calculateLine(
  quantity: number,
  unitPrice: number,
  discountPercent: number = 0,
  taxRatePercent: number = 0
): LineCalculationResult {
  const qty = Decimal.max(0, new Decimal(quantity.toString()));
  const price = Decimal.max(0, new Decimal(unitPrice.toString()));
  const discPercent = Decimal.min(100, Decimal.max(0, new Decimal(discountPercent.toString())));
  const taxPercent = Decimal.max(0, new Decimal(taxRatePercent.toString()));
  const decimalPlaces = (value: Decimal) => value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const gross = decimalPlaces(qty.mul(price));
  const discount = decimalPlaces(gross.mul(discPercent).div(100));
  const taxable = decimalPlaces(gross.minus(discount));
  const tax = decimalPlaces(taxable.mul(taxPercent).div(100));
  const lineTotal = decimalPlaces(taxable.plus(tax));

  return {
    grossAmount: gross.toNumber(),
    discountAmount: discount.toNumber(),
    taxableAmount: taxable.toNumber(),
    taxAmount: tax.toNumber(),
    total: lineTotal.toNumber(),
  };
}

export interface InvoiceCalculationResult {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export function calculateInvoiceTotals(
  items: Array<{
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    taxRatePercent?: number;
  }>
): InvoiceCalculationResult {
  let subtotal = new Decimal(0);
  let discountAmount = new Decimal(0);
  let taxableAmount = new Decimal(0);
  let taxAmount = new Decimal(0);
  let total = new Decimal(0);

  for (const item of items) {
    const quantity = new Decimal(item.quantity.toString());
    const unitPrice = new Decimal(item.unitPrice.toString());
    const discountPercent = new Decimal((item.discountPercent || 0).toString());
    const taxRatePercent = new Decimal((item.taxRatePercent || 0).toString());
    const gross = quantity.mul(unitPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const discount = gross.mul(discountPercent).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const taxable = gross.minus(discount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const tax = taxable.mul(taxRatePercent).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const lineTotal = taxable.plus(tax).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    subtotal = subtotal.plus(gross);
    discountAmount = discountAmount.plus(discount);
    taxableAmount = taxableAmount.plus(taxable);
    taxAmount = taxAmount.plus(tax);
    total = total.plus(lineTotal);
  }

  return {
    subtotal: subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    discountAmount: discountAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    taxableAmount: taxableAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    taxAmount: taxAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    total: total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
  };
}

export function formatCurrency(
  amount: number,
  currency: Currency = Currency.CDF,
  locale: string = 'fr-CD'
): string {
  const decimals = currency === Currency.USD ? 2 : 0;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return `${formatted} ${currency}`;
}
