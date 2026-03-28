-- ============================================================
-- 1. Fix: Allow admins to DELETE orders and order_items
-- ============================================================
DROP POLICY IF EXISTS "Admins can delete orders"      ON public.orders;
DROP POLICY IF EXISTS "Admins can delete order_items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can delete order_item_addons" ON public.order_item_addons;

CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete order_items" ON public.order_items
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete order_item_addons" ON public.order_item_addons
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Also allow admins to UPDATE orders (for status changes)
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. Add scope columns to discount_codes (safe if already exists)
-- ============================================================
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS applies_to_category TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS applies_to_product  UUID DEFAULT NULL;

-- ============================================================
-- 3. Fix emoji column in categories — make it nullable
-- ============================================================
ALTER TABLE public.categories
  ALTER COLUMN emoji DROP NOT NULL;
ALTER TABLE public.categories
  ALTER COLUMN emoji DROP DEFAULT;

-- ============================================================
-- 4. Add order_number column (safe if already exists from prev migration)
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT;
  i INTEGER;
BEGIN
  LOOP
    result := 'AYR';
    FOR i IN 1..10 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = result);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

GRANT EXECUTE ON FUNCTION public.generate_order_number() TO anon, authenticated;
