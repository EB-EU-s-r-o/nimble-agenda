
-- Public SELECT policy for appointments (e.g. booking availability)
CREATE POLICY "appointments_select_public"
  ON public.appointments FOR SELECT
  USING (true);
