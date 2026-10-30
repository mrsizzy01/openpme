ALTER TABLE "sales" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "payments" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "expenses" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "sales_organizationId_idempotencyKey_key" ON "sales"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "stock_movements_organizationId_idempotencyKey_key" ON "stock_movements"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "payments_organizationId_idempotencyKey_key" ON "payments"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "expenses_organizationId_idempotencyKey_key" ON "expenses"("organizationId", "idempotencyKey");
