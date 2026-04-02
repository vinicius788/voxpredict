-- AlterTable Market: add lastTradeAt
ALTER TABLE "Market" ADD COLUMN "lastTradeAt" TIMESTAMP(3);

-- CreateTable ManipulationLog
CREATE TABLE "ManipulationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" INTEGER NOT NULL,
    "attemptedAmount" DOUBLE PRECISION NOT NULL,
    "outcome" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManipulationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManipulationLog_userId_idx" ON "ManipulationLog"("userId");

-- CreateIndex
CREATE INDEX "ManipulationLog_marketId_idx" ON "ManipulationLog"("marketId");

-- CreateIndex
CREATE INDEX "ManipulationLog_code_createdAt_idx" ON "ManipulationLog"("code", "createdAt");
