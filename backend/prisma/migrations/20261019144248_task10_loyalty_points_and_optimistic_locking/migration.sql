-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;
