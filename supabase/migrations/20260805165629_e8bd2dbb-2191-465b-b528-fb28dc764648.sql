DROP POLICY IF EXISTS "Admins can manage site announcements" ON public.site_announcements;
DROP FUNCTION IF EXISTS public.has_role(uuid, text);
CREATE POLICY "Admins can manage site announcements"
ON public.site_announcements
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));