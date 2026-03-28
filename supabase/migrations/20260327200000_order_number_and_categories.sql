-- ============================================================
-- 1. Order number: short random-looking but unique & long enough
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;

-- Generate a unique order number: AYR + 10 random alphanumeric chars
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

-- Auto-assign order_number on insert
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

-- Back-fill existing orders
UPDATE public.orders SET order_number = public.generate_order_number() WHERE order_number IS NULL;

-- ============================================================
-- 2. Categories table (dynamic)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,
  label      TEXT NOT NULL,
  emoji      TEXT DEFAULT '🛍️',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categories"   ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories"     ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;

-- Seed with existing categories
INSERT INTO public.categories (slug, label, emoji, sort_order) VALUES
  ('mugs',        'المجات',       '☕', 0),
  ('accessories', 'الإكسسوارات', '✨', 1)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. Change products.category from CHECK constraint to free text
-- ============================================================
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;

-- ============================================================
-- 4. Category-level discount in categories table
-- ============================================================
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_ends_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================
-- 5. Anyone can look up order by order_number (for tracking)
-- ============================================================
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO anon, authenticated;
