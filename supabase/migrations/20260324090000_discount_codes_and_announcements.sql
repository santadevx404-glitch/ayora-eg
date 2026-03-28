-- =====================================================
-- 1. Discount Codes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  type          TEXT NOT NULL CHECK (type IN ('percent', 'fixed')), -- percent or fixed EGP
  value         NUMERIC NOT NULL,                                    -- e.g. 20 = 20% or 20 EGP
  expires_at    TIMESTAMPTZ DEFAULT NULL,                            -- NULL = never expires
  max_uses      INTEGER DEFAULT NULL,                                -- NULL = unlimited
  used_count    INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage discount codes" ON public.discount_codes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- anon can SELECT to validate a code at checkout
CREATE POLICY "Anyone can read active codes" ON public.discount_codes
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.discount_codes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;

-- =====================================================
-- 2. Announcements (popup banners)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at       TIMESTAMPTZ DEFAULT NULL,   -- NULL = no end
  link_type     TEXT DEFAULT NULL CHECK (link_type IN ('category', 'product', NULL)),
  link_value    TEXT DEFAULT NULL,          -- category slug or product UUID
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage announcements" ON public.announcements
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read announcements" ON public.announcements
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
