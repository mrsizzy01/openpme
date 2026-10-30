CREATE TYPE "DesktopTerminalStatus" AS ENUM ('ACTIVE', 'LOCKED');

ALTER TABLE "sessions"
ADD COLUMN "terminalId" TEXT;

CREATE TABLE "desktop_terminals" (
    "id" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "DesktopTerminalStatus" NOT NULL DEFAULT 'ACTIVE',
    "tokenHash" TEXT,
    "tokenRevokedAt" TIMESTAMP(3),
    "lockReason" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastIpAddress" TEXT,
    "stateVersion" INTEGER NOT NULL DEFAULT 1,
    "acknowledgedVersion" INTEGER NOT NULL DEFAULT 0,
    "lastAcknowledgedAt" TIMESTAMP(3),
    "offlineGraceHours" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "desktop_terminals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "desktop_terminals_tokenHash_key" ON "desktop_terminals"("tokenHash");
CREATE UNIQUE INDEX "desktop_terminals_organizationId_terminalId_key" ON "desktop_terminals"("organizationId", "terminalId");
CREATE INDEX "desktop_terminals_organizationId_status_idx" ON "desktop_terminals"("organizationId", "status");
CREATE INDEX "desktop_terminals_organizationId_lastHeartbeatAt_idx" ON "desktop_terminals"("organizationId", "lastHeartbeatAt");

ALTER TABLE "desktop_terminals"
ADD CONSTRAINT "desktop_terminals_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "desktop_terminals"
ADD CONSTRAINT "desktop_terminals_lockedById_fkey"
FOREIGN KEY ("lockedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
