
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.loyalty_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.loyalty_ledger TO authenticated;
GRANT ALL ON public.loyalty_ledger TO service_role;
ALTER TABLE public.loyalty_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own loyalty ledger" ON public.loyalty_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS loyalty_ledger_user_idx ON public.loyalty_ledger(user_id, created_at DESC);

-- Update confirm_order to award points
CREATE OR REPLACE FUNCTION public.confirm_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_buyer uuid := auth.uid(); v_order public.orders%ROWTYPE; v_points int;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.buyer_id <> v_buyer THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status NOT IN ('delivered','paid') THEN RAISE EXCEPTION 'Order cannot be confirmed'; END IF;

  INSERT INTO public.platform_ledger (entry_type, amount, order_id, user_id, notes)
  VALUES ('commission_sale', v_order.commission_amount, v_order.id, v_order.seller_id, 'buyer confirmed');
  UPDATE public.orders SET status='completed',
    funds_release_at = now() + interval '48 hours',
    funds_released_at = NULL,
    updated_at=now() WHERE id = p_order_id;

  -- Loyalty: 1 point per 1 ₼ of order total
  v_points := FLOOR(v_order.total)::int;
  IF v_points > 0 THEN
    UPDATE public.profiles SET loyalty_points = loyalty_points + v_points WHERE id = v_order.buyer_id;
    INSERT INTO public.loyalty_ledger (user_id, delta, reason, order_id)
    VALUES (v_order.buyer_id, v_points, 'order_confirmed', v_order.id);
  END IF;
END; $$;

-- Update auto_confirm_orders to award points
CREATE OR REPLACE FUNCTION public.auto_confirm_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order public.orders%ROWTYPE; v_count int := 0; v_points int;
BEGIN
  FOR v_order IN
    SELECT * FROM public.orders
    WHERE status IN ('paid','delivered') AND auto_confirm_at IS NOT NULL AND auto_confirm_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.platform_ledger (entry_type, amount, order_id, user_id, notes)
    VALUES ('commission_sale', v_order.commission_amount, v_order.id, v_order.seller_id, 'auto-confirmed');
    UPDATE public.orders SET status='completed',
      funds_release_at = now() + interval '48 hours',
      funds_released_at = NULL,
      updated_at=now() WHERE id = v_order.id;
    IF v_order.conversation_id IS NOT NULL THEN
      INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
      VALUES (v_order.conversation_id, v_order.seller_id,
        '✅ Sifariş 24 saat ərzində təsdiq edilmədiyi üçün avtomatik tamamlandı. Vəsait 48 saat sonra satıcının balansına köçürüləcək.', 'system');
    END IF;

    v_points := FLOOR(v_order.total)::int;
    IF v_points > 0 THEN
      UPDATE public.profiles SET loyalty_points = loyalty_points + v_points WHERE id = v_order.buyer_id;
      INSERT INTO public.loyalty_ledger (user_id, delta, reason, order_id)
      VALUES (v_order.buyer_id, v_points, 'order_auto_confirmed', v_order.id);
    END IF;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- Redemption: 100 points = 1 ₼ wallet credit. Minimum 100 points.
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(p_points integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid(); v_balance int; v_credit numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_points IS NULL OR p_points < 100 THEN RAISE EXCEPTION 'Minimum 100 xal'; END IF;
  IF p_points % 100 <> 0 THEN RAISE EXCEPTION 'Xal sayı 100-ə bölünməlidir'; END IF;

  SELECT loyalty_points INTO v_balance FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_points THEN RAISE EXCEPTION 'Kifayət qədər xal yoxdur'; END IF;

  v_credit := (p_points / 100.0)::numeric(12,2);
  UPDATE public.profiles SET
    loyalty_points = loyalty_points - p_points,
    wallet_balance = wallet_balance + v_credit
  WHERE id = v_user;

  INSERT INTO public.loyalty_ledger (user_id, delta, reason, notes)
  VALUES (v_user, -p_points, 'redeemed', v_credit::text || ' ₼ balansa köçürüldü');

  RETURN jsonb_build_object('credited', v_credit, 'remaining_points', v_balance - p_points);
END; $$;

GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(integer) TO authenticated;
