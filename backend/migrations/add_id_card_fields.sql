-- Add ID card fields to User table
ALTER TABLE "User"
ADD COLUMN "idCardFront" TEXT,
ADD COLUMN "idCardBack" TEXT;
