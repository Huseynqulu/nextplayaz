
-- 1. payment_settings.link_url
ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS link_url TEXT;

-- 2. order_payments table
CREATE TABLE IF NOT EXISTS public.order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  discount_code TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL DEFAULT 'birbank',
  reference TEXT NOT NULL UNIQUE,
  receipt_url TEXT,
  receipt_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_payments_buyer_idx ON public.order_payments(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_payments_status_idx ON public.order_payments(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.order_payments TO authenticated;
GRANT ALL ON public.order_payments TO service_role;

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyers view own order payments" ON public.order_payments FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "buyers insert own order payments" ON public.order_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id AND status = 'pending' AND order_id IS NULL AND verified_by IS NULL);

CREATE POLICY "admins update order payments" ON public.order_payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.op_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_op_touch_updated_at ON public.order_payments;
CREATE TRIGGER trg_op_touch_updated_at BEFORE UPDATE ON public.order_payments
FOR EACH ROW EXECUTE FUNCTION public.op_touch_updated_at();

-- 3. create_direct_purchase RPC
CREATE OR REPLACE FUNCTION public.create_direct_purchase(
  p_product_id UUID,
  p_quantity INT,
  p_discount_code TEXT,
  p_receipt_url TEXT,
  p_receipt_path TEXT
) RETURNS TABLE (id UUID, reference TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_buyer UUID := auth.uid();
  v_product public.products%ROWTYPE;
  v_amount NUMERIC;
  v_code public.discount_codes%ROWTYPE;
  v_ref TEXT;
  v_id UUID;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_quantity < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  IF p_receipt_url IS NULL OR length(trim(p_receipt_url)) = 0 THEN RAISE EXCEPTION 'Qəbz şəkli tələb olunur'; END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not available'; END IF;
  IF v_product.seller_id = v_buyer THEN RAISE EXCEPTION 'You cannot buy your own product'; END IF;
  IF v_product.stock < p_quantity THEN RAISE EXCEPTION 'Insufficient stock'; END IF;

  v_amount := v_product.price * p_quantity;
  IF p_discount_code IS NOT NULL AND length(trim(p_discount_code)) > 0 THEN
    SELECT * INTO v_code FROM public.discount_codes
      WHERE upper(code) = upper(trim(p_discount_code)) AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid discount code'; END IF;
    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN RAISE EXCEPTION 'Discount code expired'; END IF;
    v_amount := round(v_amount * (100 - v_code.percent) / 100.0, 2);
  END IF;

  -- Generate unique reference NP-XXXXXX
  LOOP
    v_ref := 'NP-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.order_payments WHERE reference = v_ref);
  END LOOP;

  INSERT INTO public.order_payments (
    buyer_id, product_id, quantity, discount_code, amount, method, reference,
    receipt_url, receipt_path, status
  ) VALUES (
    v_buyer, p_product_id, p_quantity, NULLIF(trim(p_discount_code),''), v_amount, 'birbank', v_ref,
    p_receipt_url, p_receipt_path, 'pending'
  ) RETURNING order_payments.id INTO v_id;

  RETURN QUERY SELECT v_id, v_ref;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_direct_purchase(UUID, INT, TEXT, TEXT, TEXT) TO authenticated;

-- 4. approve_order_payment RPC
CREATE OR REPLACE FUNCTION public.approve_order_payment(
  p_payment_id UUID,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_pay public.order_payments%ROWTYPE;
  v_order_id UUID;
BEGIN
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_pay FROM public.order_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_pay.status <> 'pending' THEN RAISE EXCEPTION 'Payment already processed'; END IF;

  -- Temporarily credit buyer's wallet so existing create_order works unchanged
  UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance,0) + v_pay.amount WHERE id = v_pay.buyer_id;

  -- Impersonate buyer for the create_order call (SECURITY DEFINER reads auth.uid via jwt claim)
  PERFORM set_config('request.jwt.claim.sub', v_pay.buyer_id::text, true);
  BEGIN
    v_order_id := public.create_order(v_pay.product_id, v_pay.quantity, v_pay.discount_code);
  EXCEPTION WHEN OTHERS THEN
    -- rollback the wallet credit on failure
    UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance,0) - v_pay.amount WHERE id = v_pay.buyer_id;
    PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
    RAISE;
  END;
  -- Restore claim
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);

  UPDATE public.order_payments
    SET status = 'approved', order_id = v_order_id, admin_notes = p_admin_notes,
        verified_by = v_admin, verified_at = now()
    WHERE id = p_payment_id;

  -- Notify buyer
  INSERT INTO public.notifications (user_id, title, body, kind, link)
  VALUES (v_pay.buyer_id, 'Ödəniş təsdiqləndi', 'Sifarişiniz uğurla yaradıldı.', 'order', '/orders');

  RETURN v_order_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.approve_order_payment(UUID, TEXT) TO authenticated;

-- 5. reject_order_payment RPC
CREATE OR REPLACE FUNCTION public.reject_order_payment(
  p_payment_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_pay public.order_payments%ROWTYPE;
BEGIN
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT * INTO v_pay FROM public.order_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_pay.status <> 'pending' THEN RAISE EXCEPTION 'Payment already processed'; END IF;

  UPDATE public.order_payments
    SET status = 'rejected', admin_notes = p_reason,
        verified_by = v_admin, verified_at = now()
    WHERE id = p_payment_id;

  INSERT INTO public.notifications (user_id, title, body, kind, link)
  VALUES (v_pay.buyer_id, 'Ödəniş rədd edildi', COALESCE(p_reason,'Ödəniş təsdiqlənmədi.'), 'order', '/orders');
END; $$;

GRANT EXECUTE ON FUNCTION public.reject_order_payment(UUID, TEXT) TO authenticated;
