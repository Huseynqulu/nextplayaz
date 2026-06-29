
-- 1) auto_message fields on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS auto_message_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_message text;

-- 2) product_stock_items table
CREATE TABLE IF NOT EXISTS public.product_stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  content text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_stock_items_product_idx ON public.product_stock_items(product_id);
CREATE INDEX IF NOT EXISTS product_stock_items_available_idx ON public.product_stock_items(product_id) WHERE delivered_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_stock_items TO authenticated;
GRANT ALL ON public.product_stock_items TO service_role;

ALTER TABLE public.product_stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers manage own stock items"
  ON public.product_stock_items
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid()));

CREATE POLICY "Admins view all stock items"
  ON public.product_stock_items
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Buyers view delivered stock items"
  ON public.product_stock_items
  FOR SELECT
  TO authenticated
  USING (order_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = auth.uid()
  ));

-- 3) Trigger to sync products.stock from undelivered items for Instant products
CREATE OR REPLACE FUNCTION public.sync_product_stock_from_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid := COALESCE(NEW.product_id, OLD.product_id);
  v_delivery text;
  v_count int;
BEGIN
  SELECT delivery::text INTO v_delivery FROM public.products WHERE id = v_product_id;
  IF v_delivery = 'Instant' THEN
    SELECT count(*) INTO v_count FROM public.product_stock_items
      WHERE product_id = v_product_id AND delivered_at IS NULL;
    UPDATE public.products SET stock = v_count WHERE id = v_product_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_items_sync ON public.product_stock_items;
CREATE TRIGGER trg_stock_items_sync
AFTER INSERT OR UPDATE OR DELETE ON public.product_stock_items
FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_from_items();

-- 4) Update create_order to deliver instant items + auto-message
CREATE OR REPLACE FUNCTION public.create_order(p_product_id uuid, p_quantity integer DEFAULT 1, p_discount_code text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_buyer uuid := auth.uid();
  v_product public.products%ROWTYPE;
  v_total numeric;
  v_balance numeric;
  v_order_id uuid;
  v_code public.discount_codes%ROWTYPE;
  v_a uuid; v_b uuid; v_conv uuid;
  v_available int;
  v_delivered_text text := '';
  v_item RECORD;
  v_is_instant boolean;
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
      -- fall back to declared stock if no item rows exist yet
      IF v_available = 0 AND v_product.stock >= p_quantity THEN
        -- treat as manual fallback (no items configured)
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

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = v_buyer FOR UPDATE;
  IF v_balance < v_total THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - v_total WHERE id = v_buyer;

  IF NOT v_is_instant THEN
    UPDATE public.products SET stock = stock - p_quantity WHERE id = p_product_id;
  END IF;

  INSERT INTO public.orders (buyer_id, seller_id, product_id, quantity, unit_price, total, status, auto_confirm_at)
  VALUES (
    v_buyer, v_product.seller_id, p_product_id, p_quantity, v_product.price, v_total,
    CASE WHEN v_is_instant THEN 'delivered'::order_status ELSE 'paid'::order_status END,
    now() + interval '24 hours'
  )
  RETURNING id INTO v_order_id;

  -- conversation
  IF v_buyer < v_product.seller_id THEN v_a := v_buyer; v_b := v_product.seller_id;
  ELSE v_a := v_product.seller_id; v_b := v_buyer; END IF;

  INSERT INTO public.conversations (user_a, user_b, product_id, order_id)
  VALUES (v_a, v_b, p_product_id, v_order_id) RETURNING id INTO v_conv;

  UPDATE public.orders SET conversation_id = v_conv WHERE id = v_order_id;

  -- Instant: deliver items now
  IF v_is_instant THEN
    FOR v_item IN
      SELECT id, content FROM public.product_stock_items
      WHERE product_id = p_product_id AND delivered_at IS NULL
      ORDER BY created_at
      LIMIT p_quantity
      FOR UPDATE SKIP LOCKED
    LOOP
      UPDATE public.product_stock_items
        SET order_id = v_order_id, delivered_at = now()
        WHERE id = v_item.id;
      v_delivered_text := v_delivered_text || E'\n• ' || v_item.content;
    END LOOP;

    UPDATE public.orders SET delivered_at = now(), delivery_payload = v_delivered_text WHERE id = v_order_id;

    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_conv, v_product.seller_id,
      '✅ Anında çatdırılma — ' || v_product.title ||
      E'\nMəbləğ: ' || v_total::text || ' ₼' ||
      E'\n\n🔑 Məhsul məlumatı:' || v_delivered_text ||
      E'\n\n24 saat ərzində problem olmasa sifariş avtomatik təsdiqlənəcək.',
      'system');
  ELSE
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_conv, v_product.seller_id,
      '🛒 Yeni sifariş: ' || v_product.title || E'\nMəbləğ: ' || v_total::text || ' ₼' ||
      E'\nSatıcı bu söhbət vasitəsilə məhsulu təhvil verməlidir. Çatdırılmadan sonra alıcı 24 saat ərzində təsdiq etməsə sifariş avtomatik təsdiqlənəcək.',
      'system');
  END IF;

  -- Optional auto-message from seller
  IF v_product.auto_message_enabled AND v_product.auto_message IS NOT NULL AND length(trim(v_product.auto_message)) > 0 THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_conv, v_product.seller_id, v_product.auto_message, 'text');
  END IF;

  RETURN v_order_id;
END; $function$;
