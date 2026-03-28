-- Add discount tracking columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_code      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_amount    NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_code_id   UUID DEFAULT NULL;
