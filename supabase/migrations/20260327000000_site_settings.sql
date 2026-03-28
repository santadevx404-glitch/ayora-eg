-- =====================================================
-- Site Settings (social media, logo, branding)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL UNIQUE,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins manage site settings" ON public.site_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can read settings (needed for footer/logo display)
CREATE POLICY "Anyone can read site settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;

-- Insert defaults
INSERT INTO public.site_settings (key, value) VALUES
  ('logo_url',        NULL),
  ('footer_text',     NULL),
  ('social_facebook', NULL),
  ('social_instagram',NULL),
  ('social_tiktok',   NULL),
  ('social_whatsapp', NULL),
  ('social_twitter',  NULL),
  ('social_youtube',  NULL)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- Atomic increment for discount code usage
-- =====================================================
CREATE OR REPLACE FUNCTION public.increment_discount_used(code_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.discount_codes
  SET used_count = used_count + 1
  WHERE id = code_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_discount_used(UUID) TO anon, authenticated;
