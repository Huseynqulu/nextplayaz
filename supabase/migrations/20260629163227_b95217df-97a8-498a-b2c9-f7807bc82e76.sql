
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Backfill: anyone with an approved seller application is already verified
UPDATE public.profiles p
SET verified_at = COALESCE(p.verified_at, sa.updated_at, sa.created_at, now())
FROM public.seller_applications sa
WHERE sa.user_id = p.id AND sa.status = 'approved' AND p.verified_at IS NULL;

CREATE OR REPLACE FUNCTION public.admin_set_verified(p_user_id uuid, p_verified boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles
  SET verified_at = CASE WHEN p_verified THEN COALESCE(verified_at, now()) ELSE NULL END
  WHERE id = p_user_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_set_verified(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_verified(uuid, boolean) TO authenticated;
