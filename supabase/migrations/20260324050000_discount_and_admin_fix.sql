-- =====================================================
-- 1. Add discount columns to products table
-- =====================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_ends_at TIMESTAMPTZ DEFAULT NULL;

-- =====================================================
-- 2. Fix admin_permissions RLS — allow admins to manage permissions
-- =====================================================
DROP POLICY IF EXISTS "Admins can view permissions" ON public.admin_permissions;
DROP POLICY IF EXISTS "Super admins can manage permissions" ON public.admin_permissions;

-- Any admin can read permissions
CREATE POLICY "Admins can view permissions" ON public.admin_permissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Any admin with 'users' permission can insert/update/delete
CREATE POLICY "Users admins can insert permissions" ON public.admin_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_permissions ap
      WHERE ap.user_id = auth.uid() AND ap.permission = 'users'
    )
  );

CREATE POLICY "Users admins can delete permissions" ON public.admin_permissions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_permissions ap2
      WHERE ap2.user_id = auth.uid() AND ap2.permission = 'users'
    )
  );

-- =====================================================
-- 3. Fix user_roles RLS — allow admins to insert/delete roles
-- =====================================================
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users admins can delete roles" ON public.user_roles;

CREATE POLICY "Users admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_permissions ap
      WHERE ap.user_id = auth.uid() AND ap.permission = 'users'
    )
  );

CREATE POLICY "Users admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_permissions ap
      WHERE ap.user_id = auth.uid() AND ap.permission = 'users'
    )
  );

-- =====================================================
-- 4. Fix handle_new_user to grant all permissions to root admin
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'santadevx404@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.admin_permissions (user_id, permission)
    VALUES
      (NEW.id, 'orders'),
      (NEW.id, 'products'),
      (NEW.id, 'users')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- 5. admin_users_view — expose emails to admins
-- =====================================================
DROP VIEW IF EXISTS public.admin_users_view;
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT au.id, au.email, au.created_at
FROM auth.users au
INNER JOIN public.user_roles ur ON ur.user_id = au.id AND ur.role = 'admin';

GRANT SELECT ON public.admin_users_view TO authenticated;
