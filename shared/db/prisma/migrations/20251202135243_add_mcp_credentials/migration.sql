-- AlterTable
ALTER TABLE "agent" ADD COLUMN "mcpApiKey" TEXT;
ALTER TABLE "agent" ADD COLUMN "webhookSecret" TEXT;
ALTER TABLE "agent" ADD COLUMN "mcpEndpointUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "agent_mcpApiKey_key" ON "agent"("mcpApiKey");












