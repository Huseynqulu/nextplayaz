
-- 1) Allow any authenticated user to list products (drop seller-role restriction)
DROP POLICY IF EXISTS "Sellers create own products" ON public.products;
CREATE POLICY "Users create own products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- 2) Commission columns on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS commission_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_net numeric NOT NULL DEFAULT 0;

-- 3) Platform ledger
CREATE TABLE IF NOT EXISTS public.platform_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL,
  amount numeric NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  withdrawal_id uuid,
  user_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_ledger TO authenticated;
GRANT ALL ON public.platform_ledger TO service_role;
ALTER TABLE public.platform_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin view ledger" ON public.platform_ledger;
CREATE POLICY "admin view ledger" ON public.platform_ledger
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 4) Wallet withdrawals
CREATE TABLE IF NOT EXISTS public.wallet_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL,
  method text NOT NULL,
  destination text NOT NULL,
  account_holder text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_withdrawals TO authenticated;
GRANT ALL ON public.wallet_withdrawals TO service_role;
ALTER TABLE public.wallet_withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users view own withdrawals" ON public.wallet_withdrawals;
CREATE POLICY "users view own withdrawals" ON public.wallet_withdrawals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "users insert own withdrawals" ON public.wallet_withdrawals;
CREATE POLICY "users insert own withdrawals" ON public.wallet_withdrawals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_withdrawals_updated_at ON public.wallet_withdrawals;
CREATE TRIGGER trg_withdrawals_updated_at BEFORE UPDATE ON public.wallet_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Withdrawal RPCs
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric, p_method text, p_destination text, p_account_holder text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_bal numeric; v_fee numeric; v_net numeric; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_amount IS NULL OR p_amount < 5 THEN RAISE EXCEPTION 'Minimum 5 AZN'; END IF;
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
END; $$;

CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(p_id uuid, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_row public.wallet_withdrawals%ROWTYPE;
BEGIN
  IF NOT public.has_role(v_admin,'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_row FROM public.wallet_withdrawals WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  UPDATE public.wallet_withdrawals SET status='approved', admin_notes=p_notes,
    reviewed_by=v_admin, reviewed_at=now(), updated_at=now() WHERE id = p_id;
  INSERT INTO public.platform_ledger (entry_type, amount, withdrawal_id, user_id, notes)
  VALUES ('commission_withdrawal', v_row.fee, p_id, v_row.user_id, p_notes);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(p_id uuid, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_row public.wallet_withdrawals%ROWTYPE;
BEGIN
  IF NOT public.has_role(v_admin,'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_row FROM public.wallet_withdrawals WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance + v_row.amount, updated_at = now() WHERE id = v_row.user_id;
  UPDATE public.wallet_withdrawals SET status='rejected', admin_notes=p_notes,
    reviewed_by=v_admin, reviewed_at=now(), updated_at=now() WHERE id = p_id;
END; $$;

-- Admin manual payout (records that platform earnings were paid out to NextPlay's real bank acct)
CREATE OR REPLACE FUNCTION public.admin_record_platform_payout(p_amount numeric, p_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_id uuid;
BEGIN
  IF NOT public.has_role(v_admin,'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  INSERT INTO public.platform_ledger (entry_type, amount, user_id, notes)
  VALUES ('manual_payout', -p_amount, v_admin, p_notes) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- 6) Drop old create_order(uuid,integer) to avoid ambiguity
DROP FUNCTION IF EXISTS public.create_order(uuid, integer);

-- 7) Rewrite create_order with commission split
CREATE OR REPLACE FUNCTION public.create_order(p_product_id uuid, p_quantity integer DEFAULT 1, p_discount_code text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_buyer uuid := auth.uid();
  v_product public.products%ROWTYPE;
  v_total numeric; v_commission numeric; v_seller_net numeric;
  v_balance numeric; v_order_id uuid;
  v_code public.discount_codes%ROWTYPE;
  v_a uuid; v_b uuid; v_conv uuid;
  v_available int; v_delivered_text text := '';
  v_item RECORD; v_is_instant boolean;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_quantity < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not available'; END IF;
  IF v_product.seller_id = v_buyer THEN RAISE EXCEPTION 'You cannot buy your own product'; END IF;

  v_is_instant := v_product.delivery::text = 'Instant';

  IF v_is_instant THEN
    SELECT count(*) INTO v_available FROM public.product_stock_items
      WHERE product_id = p_product_id AND delivered_at IS NULL;
    IF v_available < p_quantity THEN
      IF v_available = 0 AND v_product.stock >= p_quantity THEN
        v_is_instant := false;
      ELSE
        RAISE EXCEPTION 'Insufficient stock';
      END IF;
    END IF;
  ELSE
    IF v_product.stock < p_quantity THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
  END IF;

  v_total := v_product.price * p_quantity;

  IF p_discount_code IS NOT NULL AND length(trim(p_discount_code)) > 0 THEN
    SELECT * INTO v_code FROM public.discount_codes
      WHERE upper(code) = upper(trim(p_discount_code)) AND is_active = true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid discount code'; END IF;
    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN RAISE EXCEPTION 'Discount code expired'; END IF;
    IF v_code.max_uses IS NOT NULL AND v_code.used_count >= v_code.max_uses THEN RAISE EXCEPTION 'Discount code usage limit reached'; END IF;
    v_total := round(v_total * (100 - v_code.percent) / 100.0, 2);
    UPDATE public.discount_codes SET used_count = used_count + 1 WHERE id = v_code.id;
  END IF;

  v_commission := round(v_total * 0.05, 2);
  v_seller_net := v_total - v_commission;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = v_buyer FOR UPDATE;
  IF v_balance < v_total THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - v_total WHERE id = v_buyer;
  IF NOT v_is_instant THEN
    UPDATE public.products SET stock = stock - p_quantity WHERE id = p_product_id;
  END IF;

  INSERT INTO public.orders (buyer_id, seller_id, product_id, quantity, unit_price, total,
    commission_amount, seller_net, status, auto_confirm_at)
  VALUES (v_buyer, v_product.seller_id, p_product_id, p_quantity, v_product.price, v_total,
    v_commission, v_seller_net,
    CASE WHEN v_is_instant THEN 'delivered'::order_status ELSE 'paid'::order_status END,
    now() + interval '24 hours')
  RETURNING id INTO v_order_id;

  IF v_buyer < v_product.seller_id THEN v_a := v_buyer; v_b := v_product.seller_id;
  ELSE v_a := v_product.seller_id; v_b := v_buyer; END IF;

  INSERT INTO public.conversations (user_a, user_b, product_id, order_id)
  VALUES (v_a, v_b, p_product_id, v_order_id) RETURNING id INTO v_conv;
  UPDATE public.orders SET conversation_id = v_conv WHERE id = v_order_id;

  IF v_is_instant THEN
    FOR v_item IN
      SELECT id, content FROM public.product_stock_items
      WHERE product_id = p_product_id AND delivered_at IS NULL
      ORDER BY created_at LIMIT p_quantity FOR UPDATE SKIP LOCKED
    LOOP
      UPDATE public.product_stock_items SET order_id = v_order_id, delivered_at = now() WHERE id = v_item.id;
      v_delivered_text := v_delivered_text || E'\n• ' || v_item.content;
    END LOOP;
    UPDATE public.orders SET delivered_at = now(), delivery_payload = v_delivered_text WHERE id = v_order_id;
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_conv, v_product.seller_id,
      '✅ Anında çatdırılma — ' || v_product.title ||
      E'\nMəbləğ: ' || v_total::text || ' ₼' ||
      E'\n\n🔑 Məhsul məlumatı:' || v_delivered_text ||
      E'\n\n24 saat ərzində problem olmasa sifariş avtomatik təsdiqlənəcək.', 'system');
  ELSE
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_conv, v_product.seller_id,
      '🛒 Yeni sifariş: ' || v_product.title || E'\nMəbləğ: ' || v_total::text || ' ₼' ||
      E'\nSatıcı bu söhbət vasitəsilə məhsulu təhvil verməlidir.', 'system');
  END IF;

  IF v_product.auto_message_enabled AND v_product.auto_message IS NOT NULL AND length(trim(v_product.auto_message)) > 0 THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_conv, v_product.seller_id, v_product.auto_message, 'text');
  END IF;

  RETURN v_order_id;
END; $$;

-- 8) Update confirm_order — credit seller_net, log commission
CREATE OR REPLACE FUNCTION public.confirm_order(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_buyer uuid := auth.uid(); v_order public.orders%ROWTYPE;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.buyer_id <> v_buyer THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status NOT IN ('delivered','paid') THEN RAISE EXCEPTION 'Order cannot be confirmed'; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance + v_order.seller_net WHERE id = v_order.seller_id;
  INSERT INTO public.platform_ledger (entry_type, amount, order_id, user_id, notes)
  VALUES ('commission_sale', v_order.commission_amount, v_order.id, v_order.seller_id, 'buyer confirmed');
  UPDATE public.orders SET status='completed', updated_at=now() WHERE id = p_order_id;
END; $$;

-- 9) auto_confirm_orders
CREATE OR REPLACE FUNCTION public.auto_confirm_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE; v_count int := 0;
BEGIN
  FOR v_order IN
    SELECT * FROM public.orders
    WHERE status IN ('paid','delivered') AND auto_confirm_at IS NOT NULL AND auto_confirm_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.profiles SET wallet_balance = wallet_balance + v_order.seller_net WHERE id = v_order.seller_id;
    INSERT INTO public.platform_ledger (entry_type, amount, order_id, user_id, notes)
    VALUES ('commission_sale', v_order.commission_amount, v_order.id, v_order.seller_id, 'auto-confirmed');
    UPDATE public.orders SET status='completed', updated_at=now() WHERE id = v_order.id;
    IF v_order.conversation_id IS NOT NULL THEN
      INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
      VALUES (v_order.conversation_id, v_order.seller_id,
        '✅ Sifariş 24 saat ərzində təsdiq edilmədiyi üçün avtomatik tamamlandı.', 'system');
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- 10) admin_resolve_dispute — seller release uses seller_net + commission ledger
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(p_order_id uuid, p_refund boolean, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    UPDATE public.profiles SET wallet_balance=wallet_balance+v_order.seller_net WHERE id=v_order.seller_id;
    INSERT INTO public.platform_ledger (entry_type, amount, order_id, user_id, notes)
    VALUES ('commission_sale', v_order.commission_amount, v_order.id, v_order.seller_id, 'dispute resolved for seller');
    UPDATE public.orders SET status='completed', updated_at=now() WHERE id=p_order_id;
  END IF;
  IF v_order.conversation_id IS NOT NULL THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_order.conversation_id, v_uid,
      CASE WHEN p_refund THEN '⚖️ Admin etirazı təsdiqlədi. Alıcıya pul qaytarıldı.'
           ELSE '⚖️ Admin etirazı rədd etdi. Ödəniş satıcıya köçürüldü.' END ||
      COALESCE(E'\nQeyd: ' || p_notes, ''), 'system');
  END IF;
END; $$;

-- 11) admin_partial_refund — commission tutulur satıcı payından
CREATE OR REPLACE FUNCTION public.admin_partial_refund(p_order_id uuid, p_refund_amount numeric, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_order public.orders%ROWTYPE;
  v_seller_portion numeric; v_seller_commission numeric; v_seller_net_partial numeric;
BEGIN
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'support')) THEN
    RAISE EXCEPTION 'Staff only';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status NOT IN ('paid','delivered','disputed') THEN
    RAISE EXCEPTION 'Order cannot be partially refunded in status %', v_order.status;
  END IF;
  IF p_refund_amount <= 0 OR p_refund_amount > v_order.total THEN RAISE EXCEPTION 'Invalid refund amount'; END IF;

  v_seller_portion := v_order.total - p_refund_amount;
  v_seller_commission := round(v_seller_portion * 0.05, 2);
  v_seller_net_partial := v_seller_portion - v_seller_commission;

  UPDATE public.profiles SET wallet_balance = wallet_balance + p_refund_amount WHERE id = v_order.buyer_id;
  IF v_seller_portion > 0 THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance + v_seller_net_partial WHERE id = v_order.seller_id;
    INSERT INTO public.platform_ledger (entry_type, amount, order_id, user_id, notes)
    VALUES ('commission_sale', v_seller_commission, v_order.id, v_order.seller_id, 'partial refund');
  END IF;

  UPDATE public.orders SET status='completed', auto_confirm_at=NULL, updated_at=now(),
    delivery_payload = COALESCE(delivery_payload,'') ||
      E'\n[partial refund ' || p_refund_amount::text || ' AZN by staff ' || v_uid::text ||
      COALESCE(' — ' || p_notes,'') || ']'
    WHERE id = p_order_id;

  IF v_order.conversation_id IS NOT NULL THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_order.conversation_id, v_uid,
      'Admin qismən geri qaytarma qərarı verdi: ' || p_refund_amount::text || ' AZN alıcıya, ' ||
      v_seller_net_partial::text || ' AZN (5% komissya tutuldu) satıcıya köçürüldü.' ||
      COALESCE(E'\nQeyd: ' || p_notes,''), 'system');
  END IF;
END; $$;

-- 12) Backfill existing orders so seller_net is consistent
UPDATE public.orders
  SET commission_amount = round(total * 0.05, 2),
      seller_net = total - round(total * 0.05, 2)
  WHERE commission_amount = 0 AND seller_net = 0 AND status NOT IN ('cancelled','refunded');
