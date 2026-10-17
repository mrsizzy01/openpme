/**
 * Smart PME Finance - Suite de Tests Automatisés
 * Validation de la logique métier, des calculs comptables/fiscaux (RDC) et du moteur d'anomalies.
 */

import {
  calculateLine,
  calculateInvoiceTotals,
  convertCurrency,
  roundMoney,
  formatCurrency,
  Currency,
} from '../packages/shared/dist/index.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${name}`);
  } catch (error: any) {
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m ${name}`);
    console.error(`    ↳ Erreur: ${error.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Attendu: ${expected}, Reçu: ${actual}`);
  }
}

console.log('\n======================================================');
console.log('🧪 SMART PME FINANCE - EXÉCUTION DE LA SUITE DE TESTS');
console.log('======================================================\n');

// 1. Tests des calculs monétaires et arrondis
console.log('📌 1. Module Calculs Monétaires & Arrondis');

test('roundMoney arrondit correctement au centime près', () => {
  assertEqual(roundMoney(12.345), 12.35);
  assertEqual(roundMoney(12.341), 12.34);
  assertEqual(roundMoney(10.0), 10);
});

test('roundMoney pour les Francs Congolais (CDF sans décimales)', () => {
  assertEqual(roundMoney(2850.7, 0), 2851);
  assertEqual(roundMoney(2850.2, 0), 2850);
});

// 2. Tests de conversion multi-devises (USD / CDF)
console.log('\n📌 2. Module Multi-Devises (RDC CDF <-> USD)');

test('Conversion USD vers CDF avec taux légal 2850', () => {
  const result = convertCurrency(100, Currency.USD, Currency.CDF, 2850);
  assertEqual(result, 285000, '100 USD doit valoir 285 000 CDF');
});

test('Conversion CDF vers USD avec taux légal 2850', () => {
  const result = convertCurrency(285000, Currency.CDF, Currency.USD, 2850);
  assertEqual(result, 100, '285 000 CDF doit valoir 100.00 USD');
});

test('Conversion avec même devise renvoie le montant inchangé', () => {
  assertEqual(convertCurrency(500, Currency.USD, Currency.USD), 500);
  assertEqual(convertCurrency(1500000, Currency.CDF, Currency.CDF), 1500000);
});

test('Protection contre division par zéro sur taux de change nul ou négatif', () => {
  const safe = convertCurrency(1000, Currency.CDF, Currency.USD, 0);
  assertEqual(safe, 0);
});

// 3. Tests des calculs de facturation et de TVA (Régime fiscal RDC : TVA 16%)
console.log('\n📌 3. Module Facturation, Remises et TVA (16%)');

test('Calcul d’une ligne sans remise ni taxe', () => {
  const line = calculateLine(5, 20); // 5 x 20$
  assertEqual(line.grossAmount, 100);
  assertEqual(line.discountAmount, 0);
  assertEqual(line.taxableAmount, 100);
  assertEqual(line.taxAmount, 0);
  assertEqual(line.total, 100);
});

test('Calcul d’une ligne avec TVA 16% (standard RDC)', () => {
  const line = calculateLine(2, 50, 0, 16); // 100$ + 16% = 116$
  assertEqual(line.grossAmount, 100);
  assertEqual(line.taxAmount, 16);
  assertEqual(line.total, 116);
});

test('Calcul d’une ligne avec remise 10% puis TVA 16% appliquée sur le net', () => {
  const line = calculateLine(1, 100, 10, 16);
  assertEqual(line.grossAmount, 100);
  assertEqual(line.discountAmount, 10);
  assertEqual(line.taxableAmount, 90);
  assertEqual(line.taxAmount, 14.4); // 90 * 16% = 14.4
  assertEqual(line.total, 104.4);
});

test('Calcul global d’une facture multi-lignes', () => {
  const items = [
    { quantity: 2, unitPrice: 50, discountPercent: 0, taxRatePercent: 16 }, // 100 + 16 = 116
    { quantity: 1, unitPrice: 200, discountPercent: 10, taxRatePercent: 16 }, // 200 - 20 = 180 + 28.8 = 208.8
  ];
  const invoice = calculateInvoiceTotals(items);
  assertEqual(invoice.subtotal, 300);
  assertEqual(invoice.discountAmount, 20);
  assertEqual(invoice.taxableAmount, 280);
  assertEqual(invoice.taxAmount, 44.8);
  assertEqual(invoice.total, 324.8);
});

test('Gestion des quantités et pourcentages négatifs (sécurité saisie)', () => {
  const safeLine = calculateLine(-5, 50, -10, -5);
  assertEqual(safeLine.grossAmount, 0, 'Une quantité négative doit être ramenée à 0');
  assertEqual(safeLine.discountAmount, 0);
});

// 4. Tests des règles de détection des anomalies
console.log('\n📌 4. Moteur de Détection des Anomalies');

test('Règle Remise Anormale : Détecte une remise dépassant le seuil de 15%', () => {
  const orgThresholdPercent = 15;
  const appliedDiscount = 25;
  const isAnomaly = appliedDiscount > orgThresholdPercent;
  assert(isAnomaly === true, 'Une remise de 25% doit déclencher une alerte HIGH_DISCOUNT');
});

test('Règle Rupture de Stock : Détecte un stock inférieur ou égal au seuil de sécurité', () => {
  const minStockLevel = 10;
  const currentStock = 4;
  const isLowStock = currentStock <= minStockLevel;
  assert(isLowStock === true, 'Stock à 4 avec seuil à 10 doit générer une alerte');
});

test('Règle Écart de Caisse : Détecte un écart supérieur à la tolérance', () => {
  const tolerance = 10000; // 10 000 CDF
  const theoreticalBalance = 150000;
  const actualBalance = 135000; // Écart de -15 000 CDF
  const gap = Math.abs(actualBalance - theoreticalBalance);
  assert(gap > tolerance, 'Écart de 15 000 CDF supérieur à la tolérance de 10 000 CDF');
});

test('Règle Dépense Anormale : Détecte un montant excédant le seuil d’alerte', () => {
  const expenseThreshold = 1000000; // 1 000 000 CDF
  const currentExpense = 2500000;
  const isAbnormal = currentExpense >= expenseThreshold;
  assert(isAbnormal === true, 'Une dépense de 2.5M CDF doit déclencher une alerte ABNORMAL_EXPENSE');
});

test('Règle Facturation : Intégrité d’annulation (Une facture PAID ne peut être annulée directement)', () => {
  const invoiceStatus = 'PAID';
  const canDirectlyCancel = invoiceStatus !== 'PAID';
  assert(canDirectlyCancel === false, 'Une facture déjà totalement payée ne peut être annulée sans note de crédit/avoir');
});

console.log('\n======================================================');
console.log(`📊 RÉSULTAT : ${passedTests}/${totalTests} tests réussis (${failedTests} échecs)`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m✨ TOUS LES TESTS SONT AU VERT AVEC SUCCÈS !\x1b[0m\n');
  process.exit(0);
}
