CREATE OR REPLACE FUNCTION public.validate_discount_code(p_code text)
RETURNS TABLE(code text, percent numeric, status text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code public.discount_codes%ROWTYPE;
  v_normalized text;
BEGIN
  v_normalized := upper(trim(coalesce(p_code, '')));

  IF v_normalized = '' THEN
    RETURN QUERY SELECT NULL::text, NULL::numeric, 'empty'::text;
    RETURN;
  END IF;

  SELECT * INTO v_code
  FROM public.discount_codes dc
  WHERE upper(trim(dc.code)) = v_normalized
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::text, NULL::numeric, 'not_found'::text;
    RETURN;
  END IF;

  IF NOT coalesce(v_code.is_active, false) THEN
    RETURN QUERY SELECT v_code.code::text, NULL::numeric, 'inactive'::text;
    RETURN;
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN QUERY SELECT v_code.code::text, NULL::numeric, 'expired'::text;
    RETURN;
  END IF;

  IF v_code.max_uses IS NOT NULL AND v_code.used_count >= v_code.max_uses THEN
    RETURN QUERY SELECT v_code.code::text, NULL::numeric, 'limit_reached'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_code.code::text, v_code.percent::numeric, 'valid'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_discount_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_discount_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(text) TO authenticated;