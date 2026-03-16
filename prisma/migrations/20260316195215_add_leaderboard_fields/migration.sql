-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "totalPredictions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "correctPredictions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "rank" INTEGER,
ADD COLUMN     "rankChange" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isPublicProfile" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "badges" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Ensure usernames are unique before creating unique index
WITH ranked_usernames AS (
  SELECT
    "id",
    "username",
    ROW_NUMBER() OVER (PARTITION BY "username" ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "User"
  WHERE "username" IS NOT NULL
)
UPDATE "User" AS u
SET "username" = CONCAT(u."username", '_', SUBSTRING(u."id", 1, 6))
FROM ranked_usernames AS r
WHERE u."id" = r."id"
  AND r.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
