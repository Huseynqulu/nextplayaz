CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  link text,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipients_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_broadcast_announcement(
  p_title text, p_body text, p_link text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_announcement_id uuid;
  v_count integer;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) < 2 THEN
    RAISE EXCEPTION 'Başlıq tələb olunur';
  END IF;
  IF p_body IS NULL OR length(trim(p_body)) < 2 THEN
    RAISE EXCEPTION 'Mətn tələb olunur';
  END IF;

  INSERT INTO public.announcements (title, body, link, sent_by)
  VALUES (trim(p_title), trim(p_body), NULLIF(trim(p_link), ''), v_admin)
  RETURNING id INTO v_announcement_id;

  INSERT INTO public.notifications (user_id, kind, title, body, link)
  SELECT p.id, 'announcement', '📢 ' || trim(p_title), trim(p_body), NULLIF(trim(p_link), '')
  FROM public.profiles p
  WHERE p.banned_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.announcements SET recipients_count = v_count WHERE id = v_announcement_id;

  RETURN jsonb_build_object('id', v_announcement_id, 'recipients', v_count);
END $$;

REVOKE ALL ON FUNCTION public.admin_broadcast_announcement(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_announcement(text, text, text) TO authenticated;