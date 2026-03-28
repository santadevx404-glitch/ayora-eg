-- admin_permissions table: stores per-admin access rights
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('orders', 'products', 'users')),
  UNIQUE (user_id, permission)
);
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can read all permissions
CREATE POLICY "Admins can view permissions" ON public.admin_permissions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Only admins with 'users' permission can manage permissions
CREATE POLICY "Super admins can manage permissions" ON public.admin_permissions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.admin_permissions ap
      WHERE ap.user_id = auth.uid() AND ap.permission = 'users'
    )
  );

-- Give the root admin (santadevx404@gmail.com) all permissions on signup
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

-- View that exposes admin emails to other admins (security definer)
CREATE OR REPLACE VIEW public.admin_users_view
WITH (security_invoker = false)
AS
SELECT au.id, au.email, au.created_at
FROM auth.users au
INNER JOIN public.user_roles ur ON ur.user_id = au.id AND ur.role = 'admin';

-- Allow authenticated users to read admin_users_view
GRANT SELECT ON public.admin_users_view TO authenticated;

-- Allow admins to insert/update/delete user_roles (for adding new admins)
CREATE POLICY "Super admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.admin_permissions ap
      WHERE ap.user_id = auth.uid() AND ap.permission = 'users'
    )
  );

-- Orders: allow authenticated users to view their own orders via phone lookup
-- (since orders are guest-based, we expose a search by phone for profile page)
-- Admins already have SELECT via existing policy
