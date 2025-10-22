-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('CALL', 'PUT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SETTLED', 'CANCELED');

-- CreateTable
CREATE TABLE "TransactionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL,
    "expiryTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "entryPrice" DECIMAL(18,8) NOT NULL,
    "currentPrice" DECIMAL(18,8),
    "exitPrice" DECIMAL(18,8),
    "spread" DECIMAL(18,8) NOT NULL,
    "investAmount" DECIMAL(18,8) NOT NULL,
    "returnRate" DECIMAL(7,4) NOT NULL,
    "actualReturn" DECIMAL(18,8) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLog_orderNumber_key" ON "TransactionLog"("orderNumber");

-- CreateIndex
CREATE INDEX "TransactionLog_userId_status_idx" ON "TransactionLog"("userId", "status");

-- CreateIndex
CREATE INDEX "TransactionLog_orderNumber_idx" ON "TransactionLog"("orderNumber");

-- CreateIndex
CREATE INDEX "TransactionLog_assetType_createdAt_idx" ON "TransactionLog"("assetType", "createdAt");

-- CreateIndex
CREATE INDEX "TransactionLog_entryTime_expiryTime_idx" ON "TransactionLog"("entryTime", "expiryTime");

-- AddForeignKey
ALTER TABLE "TransactionLog" ADD CONSTRAINT "TransactionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
