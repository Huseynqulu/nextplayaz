-- Seller panel: commission override, suspension, admin RPCs

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS commission_rate_override numeric,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS suspend_reason text;

-- Effective commission rate helper (per-seller override → tier rate → default 0.05)
CREATE OR REPLACE FUNCTION public.seller_effective_commission_rate(_seller_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT commission_rate_override FROM public.profiles WHERE id = _seller_id),
    public.tier_commission_rate((SELECT seller_tier FROM public.profiles WHERE id = _seller_id)),
    0.05
  );
$$;
GRANT EXECUTE ON FUNCTION public.seller_effective_commission_rate(uuid) TO authenticated, service_role;

-- Rewrite create_order to use effective rate + suspension gate
CREATE OR REPLACE FUNCTION public.create_order(p_product_id uuid, p_quantity integer DEFAULT 1, p_discount_code text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_buyer uuid := auth.uid();
  v_product public.products%ROWTYPE;
  v_total numeric; v_commission numeric; v_seller_net numeric; v_rate numeric;
  v_balance numeric; v_order_id uuid;
  v_code public.discount_codes%ROWTYPE;
  v_a uuid; v_b uuid; v_conv uuid;
  v_available int; v_delivered_text text := '';
  v_item RECORD; v_is_instant boolean;
  v_suspended_until timestamptz;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_quantity < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not available'; END IF;
  IF v_product.seller_id = v_buyer THEN RAISE EXCEPTION 'You cannot buy your own product'; END IF;

  SELECT suspended_until INTO v_suspended_until FROM public.profiles WHERE id = v_product.seller_id;
  IF v_suspended_until IS NOT NULL AND v_suspended_until > now() THEN
    RAISE EXCEPTION 'Satıcı hazırda dayandırılıb, sifariş qəbul edilmir';
  END IF;

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

  v_rate := public.seller_effective_commission_rate(v_product.seller_id);
  v_commission := round(v_total * v_rate, 2);
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

  SELECT id INTO v_conv FROM public.conversations
    WHERE user_a = v_a AND user_b = v_b
    ORDER BY (product_id IS NULL) DESC, created_at ASC LIMIT 1;

  IF v_conv IS NULL THEN
    INSERT INTO public.conversations (user_a, user_b, product_id, order_id)
    VALUES (v_a, v_b, NULL, v_order_id) RETURNING id INTO v_conv;
  ELSE
    UPDATE public.conversations SET order_id = COALESCE(order_id, v_order_id), product_id = NULL WHERE id = v_conv;
  END IF;
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
      '📦 Sifariş #' || substr(v_order_id::text, 1, 8) || ' — ' || v_product.title || E' (x' || p_quantity || ')\nAvtomatik çatdırılma:' || v_delivered_text, 'system');
  ELSE
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_conv, v_buyer,
      '🛒 Yeni sifariş: ' || v_product.title || ' (x' || p_quantity || ') — #' || substr(v_order_id::text, 1, 8), 'system');
  END IF;

  RETURN v_order_id;
END $$;

-- Admin: list sellers with stats + suspension + override
CREATE OR REPLACE FUNCTION public.admin_list_sellers()
RETURNS TABLE(
  id uuid, email text, username text, display_name text, shop_name text, avatar_url text,
  seller_tier text, sales_count integer, sales_total numeric, verified_at timestamptz,
  wallet_balance numeric, commission_rate_override numeric, effective_rate numeric,
  suspended_until timestamptz, suspend_reason text,
  active_products bigint, last_seen_at timestamptz, created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY
  SELECT p.id, u.email::text, p.username, p.display_name, p.shop_name, p.avatar_url,
    p.seller_tier, p.sales_count, p.sales_total, p.verified_at, p.wallet_balance,
    p.commission_rate_override,
    public.seller_effective_commission_rate(p.id) AS effective_rate,
    p.suspended_until, p.suspend_reason,
    (SELECT count(*) FROM public.products pr WHERE pr.seller_id = p.id AND pr.is_active = true)::bigint,
    p.last_seen_at, p.created_at
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'seller'
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.sales_total DESC NULLS LAST, p.created_at DESC;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_list_sellers() TO authenticated, service_role;

-- Admin: set commission override (null = use tier default)
CREATE OR REPLACE FUNCTION public.admin_set_commission_rate(p_seller_id uuid, p_rate numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_rate IS NOT NULL AND (p_rate < 0 OR p_rate > 0.5) THEN
    RAISE EXCEPTION 'Rate must be between 0 and 0.5 (0-50%%)';
  END IF;
  UPDATE public.profiles SET commission_rate_override = p_rate, updated_at = now() WHERE id = p_seller_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_commission_rate(uuid, numeric) TO authenticated, service_role;

-- Admin: suspend seller for N hours
CREATE OR REPLACE FUNCTION public.admin_suspend_seller(p_seller_id uuid, p_hours integer, p_reason text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_until timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_hours IS NULL OR p_hours < 1 THEN RAISE EXCEPTION 'Saat 1-dən böyük olmalıdır'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN RAISE EXCEPTION 'Səbəb göstərilməlidir'; END IF;
  v_until := now() + (p_hours || ' hours')::interval;
  UPDATE public.profiles SET suspended_until = v_until, suspend_reason = trim(p_reason), updated_at = now()
    WHERE id = p_seller_id;
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (p_seller_id, 'account',
    '⛔ Hesabınız ' || p_hours::text || ' saat dayandırıldı',
    'Səbəb: ' || trim(p_reason) || E'\nMəhsullarınız bu müddət ərzində satışa çıxmayacaq.',
    '/seller-dashboard');
  RETURN v_until;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_suspend_seller(uuid, integer, text) TO authenticated, service_role;

-- Admin: lift suspension
CREATE OR REPLACE FUNCTION public.admin_unsuspend_seller(p_seller_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.profiles SET suspended_until = NULL, suspend_reason = NULL, updated_at = now()
    WHERE id = p_seller_id;
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (p_seller_id, 'account', '✅ Hesabınız yenidən aktivdir', 'Məhsullarınız yenidən satışdadır.', '/seller-dashboard');
END $$;
GRANT EXECUTE ON FUNCTION public.admin_unsuspend_seller(uuid) TO authenticated, service_role;

-- Admin: broadcast notification to a single seller (or all sellers)
CREATE OR REPLACE FUNCTION public.admin_notify_sellers(p_seller_id uuid, p_title text, p_body text, p_link text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN RAISE EXCEPTION 'Title required'; END IF;

  IF p_seller_id IS NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    SELECT DISTINCT ur.user_id, 'seller_broadcast', trim(p_title), p_body, p_link
    FROM public.user_roles ur WHERE ur.role = 'seller';
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (p_seller_id, 'seller_broadcast', trim(p_title), p_body, p_link);
    v_count := 1;
  END IF;
  RETURN v_count;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_notify_sellers(uuid, text, text, text) TO authenticated, service_role;
