
-- Fix 1: Set search_path on update_updated_at function (was missing)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Fix 2: Replace permissive "WITH CHECK (true)" on businesses_insert_owner
-- Only authenticated users can insert a business
DROP POLICY IF EXISTS "businesses_insert_owner" ON public.businesses;
CREATE POLICY "businesses_insert_authenticated" ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
