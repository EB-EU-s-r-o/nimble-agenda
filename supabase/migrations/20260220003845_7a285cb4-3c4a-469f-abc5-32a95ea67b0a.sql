-- Allow public/anon read access to businesses for the public booking page
CREATE POLICY "businesses_select_public"
ON public.businesses
FOR SELECT
USING (true);