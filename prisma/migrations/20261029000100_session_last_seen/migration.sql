ALTER TABLE "sessions" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX "sessions_userId_idx";
CREATE INDEX "sessions_userId_revoked_expiresAt_idx" ON "sessions"("userId", "revoked", "expiresAt");
CREATE INDEX "sessions_lastSeenAt_idx" ON "sessions"("lastSeenAt");
