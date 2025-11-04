-- Add new fields to LeaderboardEntry table
ALTER TABLE "LeaderboardEntry"
ADD COLUMN "totalVolume" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "highestTrade" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "lowestTrade" DECIMAL(18,2) NOT NULL DEFAULT 0;
