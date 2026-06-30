CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric, p_method text, p_destination text, p_account_holder text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_bal numeric; v_fee numeric; v_net numeric; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_amount IS NULL OR p_amount < 20 THEN RAISE EXCEPTION 'Minimum 20 AZN'; END IF;
  IF p_method NOT IN ('card','m10','bank_transfer') THEN RAISE EXCEPTION 'Invalid method'; END IF;
  IF length(coalesce(trim(p_destination),'')) < 4 THEN RAISE EXCEPTION 'Destination required'; END IF;

  SELECT wallet_balance INTO v_bal FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_bal IS NULL OR v_bal < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  v_fee := round(p_amount * 0.05, 2);
  v_net := p_amount - v_fee;

  UPDATE public.profiles SET wallet_balance = wallet_balance - p_amount, updated_at = now() WHERE id = v_uid;
  INSERT INTO public.wallet_withdrawals (user_id, amount, fee, net_amount, method, destination, account_holder)
  VALUES (v_uid, p_amount, v_fee, v_net, p_method, trim(p_destination), p_account_holder)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;