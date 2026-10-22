-- 1. Alter Product for per-product size upcharge overrides
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "sizeUpchargeM" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "sizeUpchargeL" DOUBLE PRECISION;

-- 2. Alter Ingredient for costPerUnit
ALTER TABLE "Ingredient"
ADD COLUMN IF NOT EXISTS "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Populate realistic coffee shop ingredient costs (VNĐ per 1g / 1ml / 1 chiếc)
UPDATE "Ingredient" SET "costPerUnit" = 280 WHERE "code" = 'ING_ROBUSTA' AND "costPerUnit" = 0;       -- 280.000đ / kg
UPDATE "Ingredient" SET "costPerUnit" = 420 WHERE "code" = 'ING_ARABICA' AND "costPerUnit" = 0;       -- 420.000đ / kg
UPDATE "Ingredient" SET "costPerUnit" = 65 WHERE "code" = 'ING_MILK_COND' AND "costPerUnit" = 0;      -- 65.000đ / L
UPDATE "Ingredient" SET "costPerUnit" = 38 WHERE "code" = 'ING_MILK_FRESH' AND "costPerUnit" = 0;     -- 38.000đ / L
UPDATE "Ingredient" SET "costPerUnit" = 110 WHERE "code" = 'ING_CREAM_RICH' AND "costPerUnit" = 0;    -- 110.000đ / L
UPDATE "Ingredient" SET "costPerUnit" = 1200 WHERE "code" = 'ING_MATCHA' AND "costPerUnit" = 0;       -- 1.200.000đ / kg
UPDATE "Ingredient" SET "costPerUnit" = 25 WHERE "code" = 'ING_TEA_BLACK' AND "costPerUnit" = 0;      -- 25.000đ / L
UPDATE "Ingredient" SET "costPerUnit" = 2500 WHERE "code" = 'ING_PEACH' AND "costPerUnit" = 0;        -- 2.500đ / lát
UPDATE "Ingredient" SET "costPerUnit" = 140 WHERE "code" = 'ING_SYRUP_ORANGE' AND "costPerUnit" = 0;  -- 140.000đ / L
UPDATE "Ingredient" SET "costPerUnit" = 180 WHERE "code" = 'ING_CARAMEL' AND "costPerUnit" = 0;       -- 180.000đ / L
UPDATE "Ingredient" SET "costPerUnit" = 90 WHERE "code" = 'ING_BOBA' AND "costPerUnit" = 0;           -- 90.000đ / kg
UPDATE "Ingredient" SET "costPerUnit" = 50 WHERE "code" = 'ING_SEA_SALT' AND "costPerUnit" = 0;       -- 50.000đ / kg
UPDATE "Ingredient" SET "costPerUnit" = 18000 WHERE "code" = 'ING_PAIN_AU_CHOCOLAT' AND "costPerUnit" = 0;
UPDATE "Ingredient" SET "costPerUnit" = 22000 WHERE "code" = 'ING_CHEESECAKE' AND "costPerUnit" = 0;
UPDATE "Ingredient" SET "costPerUnit" = 24000 WHERE "code" = 'ING_TIRAMISU' AND "costPerUnit" = 0;

-- 3. Alter ToppingRecipe for price, subtext, isActive
ALTER TABLE "ToppingRecipe"
ADD COLUMN IF NOT EXISTS "subtext" TEXT DEFAULT 'Topping thơm ngon chuẩn vị',
ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION NOT NULL DEFAULT 8000,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "ToppingRecipe" SET "price" = 8000, "subtext" = 'Crystal boba dẻo dai' WHERE "toppingId" = 'boba';
UPDATE "ToppingRecipe" SET "price" = 10000, "subtext" = 'Velvety Salted Foam' WHERE "toppingId" = 'cream';
UPDATE "ToppingRecipe" SET "price" = 8000, "subtext" = 'Đậm vị Robusta giòn sần sật' WHERE "toppingId" = 'jelly';
UPDATE "ToppingRecipe" SET "price" = 12000, "subtext" = 'Tăng cường tỉnh táo đậm sâu' WHERE "toppingId" = 'shot';

-- 4. Create InventoryLog table
CREATE TABLE IF NOT EXISTS "InventoryLog" (
    "id" SERIAL NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "ingredientName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'RESTOCK',
    "changeAmount" DOUBLE PRECISION NOT NULL,
    "previousStock" DOUBLE PRECISION NOT NULL,
    "newStock" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLog_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryLog_ingredientId_fkey'
  ) THEN
    ALTER TABLE "InventoryLog"
    ADD CONSTRAINT "InventoryLog_ingredientId_fkey"
    FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 5. Create StoreSetting table for Global Size Pricing
CREATE TABLE IF NOT EXISTS "StoreSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("key")
);

INSERT INTO "StoreSetting" ("key", "value", "description")
VALUES
  ('SIZE_UPCHARGE_S', '0', 'Phụ thu Size S chuẩn toàn quán (VNĐ)'),
  ('SIZE_UPCHARGE_M', '5000', 'Phụ thu Size M chuẩn toàn quán (VNĐ)'),
  ('SIZE_UPCHARGE_L', '10000', 'Phụ thu Size L chuẩn toàn quán (VNĐ)')
ON CONFLICT ("key") DO NOTHING;

-- 6. Create DiscountCode table for Voucher CRUD
CREATE TABLE IF NOT EXISTS "DiscountCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DiscountCode_code_key" ON "DiscountCode"("code");

INSERT INTO "DiscountCode" ("code", "description", "discountPercent", "minOrderAmount", "isActive")
VALUES
  ('BREW10', 'Giảm 10% cho mọi đơn hàng', 10, 0, true),
  ('BREWLITE10', 'Giảm 10% chào mừng khách hàng', 10, 0, true),
  ('BREWCOZY', 'Giảm 15% ưu đãi thành viên thân thiết', 15, 30000, true),
  ('BREW20', 'Giảm 20% cho đơn từ 50.000đ', 20, 50000, true),
  ('WELCOME20', 'Giảm 20% khách hàng mới', 20, 0, true),
  ('BREW50', 'Siêu voucher giảm 50% đặc quyền VIP', 50, 80000, true)
ON CONFLICT ("code") DO NOTHING;
