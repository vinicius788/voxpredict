-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TemplateFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateTable
CREATE TABLE "MarketProposal" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "resolveBy" TIMESTAMP(3) NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "titleTemplate" TEXT NOT NULL,
    "descTemplate" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "frequency" "TemplateFrequency" NOT NULL,
    "variables" JSONB NOT NULL,
    "minBet" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "maxBet" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketProposal_status_createdAt_idx" ON "MarketProposal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MarketProposal_userId_createdAt_idx" ON "MarketProposal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketTemplate_active_nextRunAt_idx" ON "MarketTemplate"("active", "nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketTemplate_name_key" ON "MarketTemplate"("name");

-- AddForeignKey
ALTER TABLE "MarketProposal" ADD CONSTRAINT "MarketProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
