-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountBalance" DECIMAL(18,8) NOT NULL DEFAULT 10000,
ADD COLUMN     "totalProfitLoss" DECIMAL(18,8) NOT NULL DEFAULT 0,
ADD COLUMN     "totalTrades" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "winRate" DECIMAL(5,2) NOT NULL DEFAULT 0;
