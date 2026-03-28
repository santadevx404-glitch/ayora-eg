-- =====================================================
-- 1. Product Add-on Groups & Items
-- =====================================================

CREATE TABLE IF NOT EXISTS public.product_addon_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,                   -- e.g. "الحجم", "الإضافات"
  max_select  INTEGER NOT NULL DEFAULT 1,      -- max items customer can pick
  required    BOOLEAN NOT NULL DEFAULT false,  -- must pick at least one?
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.product_addon_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view addon groups"   ON public.product_addon_groups FOR SELECT USING (true);
CREATE POLICY "Admins can manage addon groups" ON public.product_addon_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.product_addon_items (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.product_addon_groups(id) ON DELETE CASCADE NOT NULL,
  name     TEXT NOT NULL,          -- e.g. "كبير", "شوكولاتة"
  price    NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.product_addon_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view addon items"   ON public.product_addon_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage addon items" ON public.product_addon_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Store chosen addons per order_item
CREATE TABLE IF NOT EXISTS public.order_item_addons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE NOT NULL,
  addon_item_id UUID NOT NULL,   -- ref to product_addon_items (kept even if item deleted)
  addon_name    TEXT NOT NULL,   -- snapshot at time of order
  addon_price   NUMERIC NOT NULL DEFAULT 0
);
ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create order addons"  ON public.order_item_addons FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view order addons"    ON public.order_item_addons FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view own order addons" ON public.order_item_addons FOR SELECT TO anon, authenticated USING (true);

-- =====================================================
-- 2. Fix orders RLS — anon users can create & read orders
-- =====================================================
DROP POLICY IF EXISTS "Anyone can create orders"              ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items"         ON public.order_items;
DROP POLICY IF EXISTS "Users can view own orders by phone"    ON public.orders;
DROP POLICY IF EXISTS "Anyone can view order items for tracking" ON public.order_items;

CREATE POLICY "Anon and auth can insert orders"
  ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anon and auth can insert order_items"
  ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Everyone can SELECT orders (profile page phone-based lookup works for anon too)
CREATE POLICY "Anyone can select orders"
  ON public.orders FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can select order_items"
  ON public.order_items FOR SELECT TO anon, authenticated USING (true);

-- =====================================================
-- 3. Grant anon role access to sequences / tables
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT, SELECT ON public.orders TO anon;
GRANT INSERT, SELECT ON public.order_items TO anon;
GRANT INSERT, SELECT ON public.order_item_addons TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.product_addon_groups TO anon;
GRANT SELECT ON public.product_addon_items TO anon;
