-- CreateTable
CREATE TABLE "api_key" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL,
    "createdByUserId" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_key_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_key_keyHash_key" ON "api_key"("keyHash");

-- CreateIndex
CREATE INDEX "api_key_keyPrefix_idx" ON "api_key"("keyPrefix");

-- CreateIndex
CREATE INDEX "api_key_organizationId_revokedAt_idx" ON "api_key"("organizationId", "revokedAt");

-- CreateIndex
CREATE INDEX "api_key_createdByUserId_createdAt_idx" ON "api_key"("createdByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
