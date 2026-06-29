
-- 1) Add new columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS funds_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS funds_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_by uuid,
  ADD COLUMN IF NOT EXISTS reopened_reason text;

-- 2) confirm_order: do NOT credit seller wallet immediately; schedule release in 48h
CREATE OR REPLACE FUNCTION public.confirm_order(p_order_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_buyer uuid := auth.uid(); v_order public.orders%ROWTYPE;
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
END; $function$;

-- 3) auto_confirm_orders: same treatment
CREATE OR REPLACE FUNCTION public.auto_confirm_orders()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_order public.orders%ROWTYPE; v_count int := 0;
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
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $function$;

-- 4) admin_resolve_dispute (seller side): also schedule 48h release instead of crediting now
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(p_order_id uuid, p_refund boolean, p_notes text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_order public.orders%ROWTYPE;
BEGIN
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'support')) THEN
    RAISE EXCEPTION 'Staff only';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status <> 'disputed' THEN RAISE EXCEPTION 'Order is not disputed'; END IF;
  IF p_refund THEN
    UPDATE public.profiles SET wallet_balance=wallet_balance+v_order.total WHERE id=v_order.buyer_id;
    UPDATE public.products SET stock=stock+v_order.quantity WHERE id=v_order.product_id;
    UPDATE public.orders SET status='refunded', updated_at=now() WHERE id=p_order_id;
  ELSE
    INSERT INTO public.platform_ledger (entry_type, amount, order_id, user_id, notes)
    VALUES ('commission_sale', v_order.commission_amount, v_order.id, v_order.seller_id, 'dispute resolved for seller');
    UPDATE public.orders SET status='completed',
      funds_release_at = now() + interval '48 hours',
      funds_released_at = NULL,
      updated_at=now() WHERE id=p_order_id;
  END IF;
  IF v_order.conversation_id IS NOT NULL THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_order.conversation_id, v_uid,
      CASE WHEN p_refund THEN '⚖️ Admin etirazı təsdiqlədi. Alıcıya pul qaytarıldı.'
           ELSE '⚖️ Admin etirazı rədd etdi. Ödəniş satıcıya 48 saat sonra köçürüləcək.' END ||
      COALESCE(E'\nQeyd: ' || p_notes, ''), 'system');
  END IF;
END; $function$;

-- 5) admin_partial_refund: seller portion also goes into 48h pending
CREATE OR REPLACE FUNCTION public.admin_partial_refund(p_order_id uuid, p_refund_amount numeric, p_notes text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_order public.orders%ROWTYPE;
  v_seller_portion numeric; v_seller_commission numeric; v_seller_net_partial numeric;
  v_already_released boolean;
BEGIN
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'support')) THEN
    RAISE EXCEPTION 'Staff only';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status NOT IN ('paid','delivered','disputed','completed') THEN
    RAISE EXCEPTION 'Order cannot be partially refunded in status %', v_order.status;
  END IF;
  IF p_refund_amount <= 0 OR p_refund_amount > v_order.total THEN RAISE EXCEPTION 'Invalid refund amount'; END IF;

  v_already_released := v_order.funds_released_at IS NOT NULL;
  v_seller_portion := v_order.total - p_refund_amount;
  v_seller_commission := round(v_seller_portion * 0.05, 2);
  v_seller_net_partial := v_seller_portion - v_seller_commission;

  -- Refund buyer
  UPDATE public.profiles SET wallet_balance = wallet_balance + p_refund_amount WHERE id = v_order.buyer_id;

  -- Adjust seller side
  IF v_already_released THEN
    -- Funds had been released previously based on full seller_net. Reclaim difference.
    UPDATE public.profiles
      SET wallet_balance = wallet_balance - (v_order.seller_net - v_seller_net_partial)
      WHERE id = v_order.seller_id;
  END IF;

  IF v_seller_portion > 0 AND NOT v_already_released THEN
    INSERT INTO public.platform_ledger (entry_type, amount, order_id, user_id, notes)
    VALUES ('commission_sale', v_seller_commission, v_order.id, v_order.seller_id, 'partial refund');
  END IF;

  UPDATE public.orders SET status='completed', auto_confirm_at=NULL, updated_at=now(),
    seller_net = v_seller_net_partial,
    commission_amount = v_seller_commission,
    total = v_seller_portion + p_refund_amount, -- preserve original
    funds_release_at = CASE WHEN v_already_released THEN funds_release_at ELSE now() + interval '48 hours' END,
    delivery_payload = COALESCE(delivery_payload,'') ||
      E'\n[partial refund ' || p_refund_amount::text || ' AZN by staff ' || v_uid::text ||
      COALESCE(' — ' || p_notes,'') || ']'
    WHERE id = p_order_id;

  IF v_order.conversation_id IS NOT NULL THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_order.conversation_id, v_uid,
      'Admin qismən geri qaytarma qərarı verdi: ' || p_refund_amount::text || ' AZN alıcıya, ' ||
      v_seller_net_partial::text || ' AZN satıcıya köçürüləcək.' ||
      COALESCE(E'\nQeyd: ' || p_notes,''), 'system');
  END IF;
END; $function$;

-- 6) release_seller_funds: cron job releases pending funds whose 48h has elapsed
CREATE OR REPLACE FUNCTION public.release_seller_funds()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_order public.orders%ROWTYPE; v_count int := 0;
BEGIN
  FOR v_order IN
    SELECT * FROM public.orders
    WHERE status = 'completed'
      AND funds_released_at IS NULL
      AND funds_release_at IS NOT NULL
      AND funds_release_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.profiles SET wallet_balance = wallet_balance + v_order.seller_net, updated_at = now()
      WHERE id = v_order.seller_id;
    UPDATE public.orders SET funds_released_at = now(), updated_at = now() WHERE id = v_order.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $function$;

-- 7) staff_reopen_order: reopen a completed order back to disputed (with possible clawback)
CREATE OR REPLACE FUNCTION public.staff_reopen_order(p_order_id uuid, p_reason text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_order public.orders%ROWTYPE; v_seller_bal numeric;
BEGIN
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'support')) THEN
    RAISE EXCEPTION 'Staff only';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN RAISE EXCEPTION 'Səbəb göstərilməlidir'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status <> 'completed' THEN RAISE EXCEPTION 'Yalnız tamamlanmış sifarişi yenidən açmaq olar'; END IF;

  -- Clawback: if funds were released, deduct from seller's wallet (allow negative if insufficient — admin can resolve)
  IF v_order.funds_released_at IS NOT NULL THEN
    SELECT wallet_balance INTO v_seller_bal FROM public.profiles WHERE id = v_order.seller_id FOR UPDATE;
    UPDATE public.profiles SET wallet_balance = wallet_balance - v_order.seller_net, updated_at = now()
      WHERE id = v_order.seller_id;
  END IF;

  -- Reverse commission ledger entries for this order
  INSERT INTO public.platform_ledger (entry_type, amount, order_id, user_id, notes)
  VALUES ('commission_sale', -v_order.commission_amount, v_order.id, v_order.seller_id, 'order reopened by staff');

  UPDATE public.orders
    SET status = 'disputed',
        disputed_at = now(),
        disputed_reason = COALESCE(disputed_reason, '') || E'\n[Reopened by staff] ' || p_reason,
        funds_released_at = NULL,
        funds_release_at = NULL,
        auto_confirm_at = NULL,
        reopened_at = now(),
        reopened_by = v_uid,
        reopened_reason = p_reason,
        updated_at = now()
    WHERE id = p_order_id;

  IF v_order.conversation_id IS NOT NULL THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_order.conversation_id, v_uid,
      '🔄 Dəstək sifarişi yenidən açdı və mübahisəyə aldı.' || E'\nSəbəb: ' || p_reason ||
      CASE WHEN v_order.funds_released_at IS NOT NULL
        THEN E'\nSatıcının balansından ' || v_order.seller_net::text || ' ₼ tutuldu.'
        ELSE '' END, 'system');
  END IF;
END; $function$;
