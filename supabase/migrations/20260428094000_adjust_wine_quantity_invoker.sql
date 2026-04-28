-- Reduce the remaining SECURITY DEFINER exposure on stock mutation.
-- The function already validates auth.uid() and RLS protects the rows it touches,
-- so invoker privileges are sufficient and remove the authenticated SD linter warning.
ALTER FUNCTION public.adjust_wine_quantity(
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  text,
  uuid
) SECURITY INVOKER;

ALTER FUNCTION public.adjust_wine_quantity(
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  text,
  uuid
) SET search_path = public;
