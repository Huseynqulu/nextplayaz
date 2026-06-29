CREATE OR REPLACE FUNCTION public.start_conversation(p_other_user uuid, p_product_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid := auth.uid();
  v_a uuid; v_b uuid; v_id uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_other_user IS NULL OR p_other_user = v_me THEN RAISE EXCEPTION 'Invalid recipient'; END IF;

  IF v_me < p_other_user THEN v_a := v_me; v_b := p_other_user;
  ELSE v_a := p_other_user; v_b := v_me; END IF;

  SELECT id INTO v_id FROM public.conversations
    WHERE user_a = v_a AND user_b = v_b
    ORDER BY (product_id IS NULL) DESC, created_at ASC
    LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.conversations SET product_id = NULL WHERE id = v_id AND product_id IS NOT NULL;
    RETURN v_id;
  END IF;

  INSERT INTO public.conversations (user_a, user_b, product_id) VALUES (v_a, v_b, NULL)
    RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;