
-- Allow sellers to read orders for their products, buyers to read their own (already exists for buyers presumably; add seller policy)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Sellers can read their orders') THEN
    CREATE POLICY "Sellers can read their orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = seller_id);
  END IF;
END $$;

-- Atomic checkout: deduct buyer wallet, decrement stock, create order in 'paid' (escrow) status
CREATE OR REPLACE FUNCTION public.create_order(p_product_id uuid, p_quantity int DEFAULT 1)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid := auth.uid();
  v_product public.products%ROWTYPE;
  v_total numeric;
  v_balance numeric;
  v_order_id uuid;
BEGIN
  IF v_buyer IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not available';
  END IF;
  IF v_product.seller_id = v_buyer THEN
    RAISE EXCEPTION 'You cannot buy your own product';
  END IF;
  IF v_product.stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

  v_total := v_product.price * p_quantity;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = v_buyer FOR UPDATE;
  IF v_balance < v_total THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - v_total WHERE id = v_buyer;
  UPDATE public.products SET stock = stock - p_quantity WHERE id = p_product_id;

  INSERT INTO public.orders (buyer_id, seller_id, product_id, quantity, unit_price, total, status)
  VALUES (v_buyer, v_product.seller_id, p_product_id, p_quantity, v_product.price, v_total, 'paid')
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(uuid, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, int) TO authenticated;

-- Seller marks order as delivered with payload (e.g. game key)
CREATE OR REPLACE FUNCTION public.mark_order_delivered(p_order_id uuid, p_payload text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller uuid := auth.uid();
BEGIN
  IF v_seller IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.orders
  SET status = 'delivered', delivery_payload = p_payload, updated_at = now()
  WHERE id = p_order_id AND seller_id = v_seller AND status = 'paid';
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found or not deliverable'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_delivered(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_order_delivered(uuid, text) TO authenticated;

-- Buyer confirms order — releases escrow to seller wallet
CREATE OR REPLACE FUNCTION public.confirm_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid := auth.uid();
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.buyer_id <> v_buyer THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_order.status NOT IN ('delivered', 'paid') THEN
    RAISE EXCEPTION 'Order cannot be confirmed';
  END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance + v_order.total WHERE id = v_order.seller_id;
  UPDATE public.orders SET status = 'completed', updated_at = now() WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_order(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.confirm_order(uuid) TO authenticated;

-- Demo: give every existing user 100 AZN wallet to try checkout
UPDATE public.profiles SET wallet_balance = GREATEST(wallet_balance, 100) WHERE wallet_balance < 100;
