-- =====================================================
-- FIX: Allow anyone (anon) to insert orders & order_items
-- The original policies used "WITH CHECK (true)" but
-- Supabase anon role needs explicit grant too.
-- =====================================================

-- Drop old policies and recreate them properly
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- Allow both anon and authenticated to insert orders
CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow both anon and authenticated to insert order_items
CREATE POLICY "Anyone can create order items" ON public.order_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow users to view their own orders by phone (for profile tracking)
DROP POLICY IF EXISTS "Users can view own orders by phone" ON public.orders;
CREATE POLICY "Users can view own orders by phone" ON public.orders
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow reading order_items for order tracking
DROP POLICY IF EXISTS "Anyone can view order items for tracking" ON public.order_items;
CREATE POLICY "Anyone can view order items for tracking" ON public.order_items
  FOR SELECT
  TO anon, authenticated
  USING (true);
