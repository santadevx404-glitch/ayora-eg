-- ============================================================
-- 1. Add scope columns to discount_codes
--    applies_to_category: slug of a category (nullable)
--    applies_to_product:  product UUID (nullable)
-- ============================================================
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS applies_to_category TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS applies_to_product  UUID DEFAULT NULL;

-- Foreign key hints (soft — not enforced with ON DELETE CASCADE
-- so deleted categories/products don't break existing codes)
-- ALTER TABLE public.discount_codes
--   ADD CONSTRAINT fk_discount_product FOREIGN KEY (applies_to_product) REFERENCES public.products(id) ON DELETE SET NULL;

-- ============================================================
-- 2. Ensure emoji column allows NULL (was NOT NULL with default in some setups)
-- ============================================================
ALTER TABLE public.categories
  ALTER COLUMN emoji DROP NOT NULL;
ALTER TABLE public.categories
  ALTER COLUMN emoji DROP DEFAULT;

-- ============================================================
-- 3. Ensure order_number is always returned on INSERT
--    (trigger already exists from previous migration — just verify)
-- ============================================================
-- No changes needed if 20260327200000 was already applied.

-- ============================================================
-- 4. CLEAR ALL PRODUCTS (تصفير المنتجات)
-- ============================================================
DELETE FROM public.order_item_addons;
DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.addon_items;
DELETE FROM public.addon_groups;
DELETE FROM public.products;

-- ============================================================
-- 5. CLEAR ALL ORDERS (تصفير الطلبات) — already done above
--    but explicit for clarity
-- ============================================================
-- Already cleared in step 4 (CASCADE or explicit deletes)

-- ============================================================
-- 6. Reset sequences if any (Supabase uses UUIDs so no sequences needed)
-- ============================================================

-- ============================================================
-- Done
-- ============================================================
