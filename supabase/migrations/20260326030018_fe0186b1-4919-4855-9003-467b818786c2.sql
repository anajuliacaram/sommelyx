-- FIX 1: has_role() ignores _user_id parameter, always uses auth.uid() — 
-- the parameter should be used so admins can check other users' roles correctly
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- FIX 2: wines RLS — restrict from public to authenticated (defense-in-depth)
DROP POLICY IF EXISTS "Users can view own wines" ON public.wines;
CREATE POLICY "Users can view own wines" ON public.wines FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wines" ON public.wines;
CREATE POLICY "Users can insert own wines" ON public.wines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wines" ON public.wines;
CREATE POLICY "Users can update own wines" ON public.wines FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wines" ON public.wines;
CREATE POLICY "Users can delete own wines" ON public.wines FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- FIX 3: wine_events RLS — restrict from public to authenticated
DROP POLICY IF EXISTS "Users can view own events" ON public.wine_events;
CREATE POLICY "Users can view own events" ON public.wine_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own events" ON public.wine_events;
CREATE POLICY "Users can insert own events" ON public.wine_events FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) AND (EXISTS (SELECT 1 FROM wines WHERE wines.id = wine_events.wine_id AND wines.user_id = auth.uid())));

-- FIX 4: profiles RLS — restrict from public to authenticated
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- FIX 5: user_roles RLS — restrict from public to authenticated
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- FIX 6: subscriptions RLS — restrict from public to authenticated
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);