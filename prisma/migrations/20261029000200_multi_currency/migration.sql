CREATE TYPE "CashMovementType" AS ENUM ('IN', 'OUT');

DELETE FROM "exchange_rates"
WHERE "id" IN (
    SELECT "id"
    FROM (
        SELECT
            "id",
            ROW_NUMBER() OVER (
                PARTITION BY "organizationId", "fromCurrency", "toCurrency", "effectiveDate"::date
                ORDER BY "createdAt" DESC, "id" DESC
            ) AS row_number
        FROM "exchange_rates"
    ) AS ranked
    WHERE ranked.row_number > 1
);

ALTER TABLE "exchange_rates"
ALTER COLUMN "effectiveDate" SET DATA TYPE DATE USING "effectiveDate"::date;

ALTER TABLE "payments"
ADD COLUMN "appliedAmount" DECIMAL(15,2),
ADD COLUMN "exchangeRateUsdToCdf" DECIMAL(12,4) NOT NULL DEFAULT 2850.00;

ALTER TABLE "sales"
ADD COLUMN "changeAmountCdf" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
ADD COLUMN "exchangeRateUsdToCdf" DECIMAL(12,4) NOT NULL DEFAULT 2850.00;

ALTER TABLE "expenses"
ADD COLUMN "exchangeRateUsdToCdf" DECIMAL(12,4) NOT NULL DEFAULT 2850.00;

UPDATE "sales" AS sale
SET "exchangeRateUsdToCdf" = COALESCE(
    (
        SELECT rate."rate"
        FROM "exchange_rates" AS rate
        WHERE rate."organizationId" = sale."organizationId"
          AND rate."fromCurrency" = 'USD'
          AND rate."toCurrency" = 'CDF'
          AND rate."effectiveDate" <= sale."createdAt"::date
        ORDER BY rate."effectiveDate" DESC
        LIMIT 1
    ),
    (
        SELECT settings."exchangeRateUsdToCdf"
        FROM "organization_settings" AS settings
        WHERE settings."organizationId" = sale."organizationId"
    ),
    2850.00
);

UPDATE "payments" AS payment
SET "exchangeRateUsdToCdf" = COALESCE(
    (
        SELECT rate."rate"
        FROM "exchange_rates" AS rate
        WHERE rate."organizationId" = payment."organizationId"
          AND rate."fromCurrency" = 'USD'
          AND rate."toCurrency" = 'CDF'
          AND rate."effectiveDate" <= payment."createdAt"::date
        ORDER BY rate."effectiveDate" DESC
        LIMIT 1
    ),
    (
        SELECT settings."exchangeRateUsdToCdf"
        FROM "organization_settings" AS settings
        WHERE settings."organizationId" = payment."organizationId"
    ),
    2850.00
);

UPDATE "expenses" AS expense
SET "exchangeRateUsdToCdf" = COALESCE(
    (
        SELECT rate."rate"
        FROM "exchange_rates" AS rate
        WHERE rate."organizationId" = expense."organizationId"
          AND rate."fromCurrency" = 'USD'
          AND rate."toCurrency" = 'CDF'
          AND rate."effectiveDate" <= expense."date"::date
        ORDER BY rate."effectiveDate" DESC
        LIMIT 1
    ),
    (
        SELECT settings."exchangeRateUsdToCdf"
        FROM "organization_settings" AS settings
        WHERE settings."organizationId" = expense."organizationId"
    ),
    2850.00
);

UPDATE "payments" AS payment
SET "appliedAmount" = CASE
    WHEN invoice."currency" = payment."currency" THEN payment."amount"
    WHEN payment."currency" = 'USD' AND invoice."currency" = 'CDF'
        THEN ROUND(payment."amount" * payment."exchangeRateUsdToCdf", 0)
    ELSE ROUND(payment."amount" / payment."exchangeRateUsdToCdf", 2)
END
FROM "invoices" AS invoice
WHERE invoice."id" = payment."invoiceId";

UPDATE "payments"
SET "appliedAmount" = "amount"
WHERE "invoiceId" IS NULL;

CREATE TABLE "cash_movements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exchange_rates_organizationId_fromCurrency_toCurrency_effec_key"
ON "exchange_rates"("organizationId", "fromCurrency", "toCurrency", "effectiveDate");

CREATE INDEX "cash_movements_organizationId_idx"
ON "cash_movements"("organizationId");

CREATE INDEX "cash_movements_cashSessionId_createdAt_idx"
ON "cash_movements"("cashSessionId", "createdAt");

ALTER TABLE "cash_movements"
ADD CONSTRAINT "cash_movements_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cash_movements"
ADD CONSTRAINT "cash_movements_cashSessionId_fkey"
FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
