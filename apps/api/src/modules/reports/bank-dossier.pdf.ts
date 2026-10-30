import PDFDocument from 'pdfkit';
import { Currency } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { BankDossierTotals, MonthlyCurrencyTotals } from './bank-dossier.calculations';

export interface BankDossierOrganization {
  name: string;
  legalName: string | null;
  taxId: string | null;
  rccm: string | null;
  idNat: string | null;
  address: string | null;
  city: string | null;
}

const NAVY = '#0B1F4D';
const TURQUOISE = '#0EA5A4';
const PAGE_WIDTH = 770;
const ROW_HEIGHT = 23;

function formatAmount(amount: Prisma.Decimal, currency: Currency): string {
  const places = currency === Currency.CDF ? 0 : 2;
  const fixed = amount.toFixed(places);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped}${fraction ? `,${fraction}` : ''} ${currency}`;
}

function formatPercent(numerator: Prisma.Decimal, denominator: Prisma.Decimal): string {
  if (denominator.isZero()) return 'N/D';
  return `${numerator.mul(100).div(denominator).toDecimalPlaces(1).toFixed(1)} %`;
}

function totalFor(
  rows: MonthlyCurrencyTotals[],
  field: keyof Omit<MonthlyCurrencyTotals, 'month'>,
): Prisma.Decimal {
  return rows.reduce((total, row) => total.plus(row[field]), new Prisma.Decimal(0));
}

function drawBrandLogo(doc: PDFKit.PDFDocument, x: number, y: number): void {
  doc.save();
  doc.fillColor(NAVY)
    .moveTo(x + 18, y)
    .lineTo(x + 35, y + 6)
    .lineTo(x + 33, y + 24)
    .lineTo(x + 18, y + 34)
    .lineTo(x + 3, y + 24)
    .lineTo(x + 1, y + 6)
    .closePath()
    .fill();
  doc.strokeColor(TURQUOISE)
    .lineWidth(3)
    .moveTo(x + 9, y + 17)
    .lineTo(x + 15, y + 23)
    .lineTo(x + 27, y + 10)
    .stroke();
  doc.restore();
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle: string,
): number {
  drawBrandLogo(doc, 36, 30);
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(21).text(title, 82, 31);
  doc.fillColor('#334155').font('Helvetica').fontSize(10).text(subtitle, 82, 59);
  doc.moveTo(36, 79).lineTo(806, 79).strokeColor('#CBD5E1').lineWidth(1).stroke();
  return 92;
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  columns: Array<{ label: string; width: number }>,
  values: string[],
  y: number,
  header = false,
): number {
  const background = header ? NAVY : '#F1F5F9';
  doc.save().fillColor(background).rect(36, y, PAGE_WIDTH, ROW_HEIGHT).fill().restore();
  let x = 36;
  columns.forEach((column, index) => {
    doc
      .fillColor(header ? '#FFFFFF' : '#0F172A')
      .font(header ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(header ? 8 : 8.5)
      .text(values[index] ?? '', x + 4, y + 7, {
        width: column.width - 8,
        lineBreak: false,
        ellipsis: true,
      });
    x += column.width;
  });
  return y + ROW_HEIGHT;
}

function formatMonth(month: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00.000Z`));
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  doc
    .fillColor('#64748B')
    .font('Helvetica')
    .fontSize(8)
    .text('Généré par Smart PME Finance', 36, 568, { width: PAGE_WIDTH, align: 'right' });
}

export function buildBankDossierPdf(
  organization: BankDossierOrganization,
  totals: BankDossierTotals,
  startDate: Date,
  endDate: Date,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 30, right: 36, bottom: 30, left: 36 },
    info: {
      Title: `Dossier Banque - ${organization.name}`,
      Author: 'Smart PME Finance',
      Subject: 'Synthèse financière des 6 ou 12 derniers mois',
    },
  });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.once('end', () => resolve(Buffer.concat(chunks)));
    doc.once('error', reject);

    const dateFormat = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const period = `Période : ${dateFormat.format(startDate)} au ${dateFormat.format(endDate)}`;
    let y = drawHeader(doc, 'Dossier Banque', `${organization.name} · ${period}`);

    const legalDetails = [
      organization.legalName && `Dénomination : ${organization.legalName}`,
      organization.taxId && `NIF : ${organization.taxId}`,
      organization.rccm && `RCCM : ${organization.rccm}`,
      organization.idNat && `ID NAT : ${organization.idNat}`,
      [organization.address, organization.city].filter(Boolean).join(', ') || null,
    ].filter((line): line is string => Boolean(line));
    doc.fillColor('#334155').font('Helvetica').fontSize(9).text(
      legalDetails.length ? legalDetails.join('  ·  ') : 'Coordonnées légales non renseignées',
      36,
      y,
      { width: PAGE_WIDTH },
    );
    y += 37;

    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12).text('Résumé financier par devise', 36, y);
    y += 20;
    const summaryColumns = [
      { label: 'Devise', width: 55 },
      { label: 'Ventes HT', width: 95 },
      { label: 'Marge brute*', width: 95 },
      { label: 'Marge', width: 70 },
      { label: 'Encaissements', width: 90 },
      { label: 'Dépenses', width: 85 },
      { label: 'Flux net', width: 85 },
      { label: 'Écart caisse', width: 95 },
      { label: 'Couverture marge', width: 100 },
    ];
    y = drawTableRow(doc, summaryColumns, summaryColumns.map((column) => column.label), y, true);

    for (const currency of [Currency.CDF, Currency.USD]) {
      const rows = totals.months[currency];
      const sales = totalFor(rows, 'sales');
      const margin = totalFor(rows, 'grossMargin');
      const coveredSales = totalFor(rows, 'marginCoveredSales');
      y = drawTableRow(doc, summaryColumns, [
        currency,
        formatAmount(sales, currency),
        formatAmount(margin, currency),
        formatPercent(margin, coveredSales),
        formatAmount(totalFor(rows, 'collections'), currency),
        formatAmount(totalFor(rows, 'expenses'), currency),
        formatAmount(totalFor(rows, 'netCashFlow'), currency),
        formatAmount(totalFor(rows, 'cashDifference'), currency),
        formatPercent(coveredSales, sales),
      ], y);
    }

    y += 17;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12).text('Régularité des paiements clients', 36, y);
    y += 19;
    const paidCount = new Prisma.Decimal(totals.paidInvoiceCount);
    const onTimeCount = new Prisma.Decimal(totals.invoicesPaidOnTime);
    const paymentRate = totals.paidInvoiceCount === 0
      ? 'Aucune facture réglée intégralement sur la période.'
      : `${totals.invoicesPaidOnTime} facture(s) réglée(s) à temps sur ${totals.paidInvoiceCount} (${formatPercent(onTimeCount, paidCount)}). ${totals.invoicesPaidLate} réglée(s) après échéance.`;
    doc.fillColor('#334155').font('Helvetica').fontSize(10).text(paymentRate, 36, y, { width: PAGE_WIDTH });

    y += 43;
    doc.fillColor('#475569').font('Helvetica').fontSize(8.5).text(
      '* Marge brute hors TVA, calculée uniquement sur les lignes dont le coût d’achat était enregistré au moment de la vente. La couverture indique la part des ventes ayant un coût disponible; les ventes historiques sans coût sont présentées séparément.',
      36,
      y,
      { width: PAGE_WIDTH },
    );
    drawFooter(doc);

    const detailColumns = [
      { label: 'Mois', width: 75 },
      { label: 'Ventes HT', width: 95 },
      { label: 'Marge brute*', width: 100 },
      { label: 'Ventes sans coût', width: 100 },
      { label: 'Encaissements', width: 100 },
      { label: 'Dépenses', width: 95 },
      { label: 'Flux net', width: 95 },
      { label: 'Écart caisse', width: 110 },
    ];

    for (const currency of [Currency.CDF, Currency.USD]) {
      doc.addPage();
      y = drawHeader(doc, `Détail mensuel — ${currency}`, `${organization.name} · ${period}`);
      y = drawTableRow(doc, detailColumns, detailColumns.map((column) => column.label), y, true);
      for (const row of totals.months[currency]) {
        y = drawTableRow(doc, detailColumns, [
          formatMonth(row.month),
          formatAmount(row.sales, currency),
          formatAmount(row.grossMargin, currency),
          formatAmount(row.marginUnavailableSales, currency),
          formatAmount(row.collections, currency),
          formatAmount(row.expenses, currency),
          formatAmount(row.netCashFlow, currency),
          formatAmount(row.cashDifference, currency),
        ], y);
      }
      drawFooter(doc);
    }

    doc.end();
  });
}
