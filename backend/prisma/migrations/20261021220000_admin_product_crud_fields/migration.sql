-- AlterTable
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'vietnamese',
ADD COLUMN IF NOT EXISTS "tag" TEXT DEFAULT 'Phổ biến',
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "isSoldOutManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Populate accurate categories and tags for existing seeded products
UPDATE "Product" SET "category" = 'vietnamese', "tag" = 'Đậm vị' WHERE "name" ILIKE '%Đen%';
UPDATE "Product" SET "category" = 'vietnamese', "tag" = 'Phổ biến' WHERE "name" ILIKE '%Sữa%';
UPDATE "Product" SET "category" = 'vietnamese', "tag" = 'Béo ngậy' WHERE "name" ILIKE '%Bạc Xỉu%';
UPDATE "Product" SET "category" = 'vietnamese', "tag" = 'Đặc sản' WHERE "name" ILIKE '%Muối%';
UPDATE "Product" SET "category" = 'espresso', "tag" = 'Signature' WHERE "name" ILIKE '%Macchiato%' OR "name" ILIKE '%Espresso%';
UPDATE "Product" SET "category" = 'tea', "tag" = 'Uji Kyoto' WHERE "name" ILIKE '%Matcha%';
UPDATE "Product" SET "category" = 'tea', "tag" = 'Thanh mát' WHERE "name" ILIKE '%Trà%';
UPDATE "Product" SET "category" = 'bakery', "tag" = 'Bơ Pháp' WHERE "name" ILIKE '%Pain%' OR "name" ILIKE '%Croissant%';
UPDATE "Product" SET "category" = 'bakery', "tag" = 'Xứ Basque' WHERE "name" ILIKE '%Basque%' OR "name" ILIKE '%Cheesecake%';
UPDATE "Product" SET "category" = 'bakery', "tag" = 'Cổ điển Ý' WHERE "name" ILIKE '%Tiramisu%';

-- Sync PostgreSQL sequences so newly created Products / Ingredients never collide with seeded IDs
SELECT setval(pg_get_serial_sequence('"Product"', 'id'), COALESCE((SELECT MAX(id) FROM "Product"), 1), true);
SELECT setval(pg_get_serial_sequence('"Ingredient"', 'id'), COALESCE((SELECT MAX(id) FROM "Ingredient"), 1), true);
SELECT setval(pg_get_serial_sequence('"Recipe"', 'id'), COALESCE((SELECT MAX(id) FROM "Recipe"), 1), true);
