CREATE OR REPLACE FUNCTION public.record_user_ip(p_ip text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR p_ip IS NULL OR length(trim(p_ip)) = 0 THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET
    last_ip = p_ip,
    last_ip_at = now(),
    signup_ip = COALESCE(signup_ip, p_ip)
  WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.record_user_ip(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_user_ip(text) TO authenticated;