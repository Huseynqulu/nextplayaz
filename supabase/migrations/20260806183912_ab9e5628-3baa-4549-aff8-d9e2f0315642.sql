-- 1. Create enum for campaign funding source
DO $$ BEGIN
    CREATE TYPE public.campaign_funding_source AS ENUM ('platform', 'seller');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Enhance discount_codes table
ALTER TABLE public.discount_codes 
ADD COLUMN IF NOT EXISTS campaign_name text,
ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percentage', -- 'percentage' or 'fixed'
ADD COLUMN IF NOT EXISTS fixed_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS max_discount_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS min_subtotal numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS funding_source public.campaign_funding_source DEFAULT 'seller',
ADD COLUMN IF NOT EXISTS start_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS per_user_limit integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_new_customer_only boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_stackable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS eligible_seller_ids uuid[], -- NULL means all sellers
ADD COLUMN IF NOT EXISTS eligible_product_ids uuid[]; -- NULL means all products

-- 3. Create campaign_usage table for better tracking
CREATE TABLE IF NOT EXISTS public.campaign_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid REFERENCES public.discount_codes(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    discount_amount numeric(10,2) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT ON public.campaign_usage TO authenticated;
GRANT ALL ON public.campaign_usage TO service_role;

ALTER TABLE public.campaign_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaign usage"
ON public.campaign_usage FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 4. Update validate_discount_code RPC
CREATE OR REPLACE FUNCTION public.validate_discount_code(
    p_code text,
    p_user_id uuid DEFAULT auth.uid(),
    p_product_id uuid DEFAULT NULL,
    p_subtotal numeric DEFAULT 0
)
 RETURNS TABLE(
    code text, 
    discount_type text,
    percent numeric, 
    fixed_amount numeric,
    max_discount_amount numeric,
    status text,
    message text
)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code public.discount_codes%ROWTYPE;
  v_normalized text;
  v_order_count integer;
  v_user_usage_count integer;
  v_product public.products%ROWTYPE;
BEGIN
  v_normalized := upper(trim(coalesce(p_code, '')));

  IF v_normalized = '' THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, 'empty'::text, 'Kod daxil edilməyib'::text;
    RETURN;
  END IF;

  SELECT * INTO v_code
  FROM public.discount_codes dc
  WHERE upper(trim(dc.code)) = v_normalized
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, 'not_found'::text, 'Endirim kodu tapılmadı'::text;
    RETURN;
  END IF;

  IF NOT coalesce(v_code.is_active, false) THEN
    RETURN QUERY SELECT v_code.code::text, v_code.discount_type, NULL::numeric, NULL::numeric, NULL::numeric, 'inactive'::text, 'Bu kod aktiv deyil'::text;
    RETURN;
  END IF;

  IF v_code.start_at IS NOT NULL AND v_code.start_at > now() THEN
    RETURN QUERY SELECT v_code.code::text, v_code.discount_type, NULL::numeric, NULL::numeric, NULL::numeric, 'not_started'::text, 'Kampaniya hələ başlamayıb'::text;
    RETURN;
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN QUERY SELECT v_code.code::text, v_code.discount_type, NULL::numeric, NULL::numeric, NULL::numeric, 'expired'::text, 'Kodun vaxtı bitib'::text;
    RETURN;
  END IF;

  IF v_code.max_uses IS NOT NULL AND v_code.used_count >= v_code.max_uses THEN
    RETURN QUERY SELECT v_code.code::text, v_code.discount_type, NULL::numeric, NULL::numeric, NULL::numeric, 'limit_reached'::text, 'Ümumi istifadə limiti dolub'::text;
    RETURN;
  END IF;

  IF p_subtotal < v_code.min_subtotal THEN
    RETURN QUERY SELECT v_code.code::text, v_code.discount_type, v_code.percent::numeric, v_code.fixed_amount, v_code.max_discount_amount, 'min_subtotal_not_reached'::text, 'Minimum məbləğ çatmayıb: ' || v_code.min_subtotal || ' AZN'::text;
    RETURN;
  END IF;

  IF p_user_id IS NOT NULL THEN
    IF v_code.is_new_customer_only THEN
      SELECT count(*) INTO v_order_count FROM public.orders WHERE buyer_id = p_user_id AND status IN ('paid', 'delivered', 'confirmed');
      IF v_order_count > 0 THEN
        RETURN QUERY SELECT v_code.code::text, v_code.discount_type, NULL::numeric, NULL::numeric, NULL::numeric, 'new_customer_only'::text, 'Yalnız yeni müştərilər üçün'::text;
        RETURN;
      END IF;
    END IF;

    SELECT count(*) INTO v_user_usage_count FROM public.campaign_usage WHERE campaign_id = v_code.id AND user_id = p_user_id;
    IF v_user_usage_count >= v_code.per_user_limit THEN
      RETURN QUERY SELECT v_code.code::text, v_code.discount_type, NULL::numeric, NULL::numeric, NULL::numeric, 'already_used'::text, 'Siz bu kodu artıq istifadə etmisiniz'::text;
      RETURN;
    END IF;
  END IF;

  IF p_product_id IS NOT NULL THEN
    SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
    
    -- Check if it's a gift card or wallet top-up (simulated by category check)
    IF v_product.category IN ('giftcards', 'wallet') THEN
      RETURN QUERY SELECT v_code.code::text, v_code.discount_type, NULL::numeric, NULL::numeric, NULL::numeric, 'excluded_category'::text, 'Bu kateqoriya üçün keçərli deyil'::text;
      RETURN;
    END IF;

    IF v_code.eligible_product_ids IS NOT NULL AND NOT (v_product.id = ANY(v_code.eligible_product_ids)) THEN
      RETURN QUERY SELECT v_code.code::text, v_code.discount_type, NULL::numeric, NULL::numeric, NULL::numeric, 'product_not_eligible'::text, 'Məhsul kampaniyaya daxil deyil'::text;
      RETURN;
    END IF;

    IF v_code.eligible_seller_ids IS NOT NULL AND NOT (v_product.seller_id = ANY(v_code.eligible_seller_ids)) THEN
      RETURN QUERY SELECT v_code.code::text, v_code.discount_type, NULL::numeric, NULL::numeric, NULL::numeric, 'seller_not_eligible'::text, 'Satıcı kampaniyaya daxil deyil'::text;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT 
    v_code.code::text, 
    v_code.discount_type, 
    v_code.percent::numeric, 
    v_code.fixed_amount,
    v_code.max_discount_amount,
    'valid'::text,
    'Etibarlı'::text;
END;
$function$;

-- 5. Update create_order RPC
CREATE OR REPLACE FUNCTION public.create_order(p_product_id uuid, p_quantity integer DEFAULT 1, p_discount_code text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_buyer uuid := auth.uid();
  v_product public.products%ROWTYPE;
  v_subtotal numeric; v_total numeric; v_discount_amount numeric := 0;
  v_commission numeric; v_seller_net numeric; v_rate numeric;
  v_balance numeric; v_order_id uuid;
  v_code public.discount_codes%ROWTYPE;
  v_conv uuid;
  v_available int;
  v_suspended_until timestamptz;
  v_is_instant boolean;
  v_val_status text;
  v_val_msg text;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_quantity < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

  -- Atomic lock on product and buyer balance
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
        v_is_instant := false;
        IF v_product.stock < p_quantity THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
    END IF;
  ELSE
    IF v_product.stock < p_quantity THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
  END IF;

  v_subtotal := v_product.price * p_quantity;
  v_total := v_subtotal;

  IF p_discount_code IS NOT NULL AND length(trim(p_discount_code)) > 0 THEN
    -- Verify discount again on server side
    SELECT status, message INTO v_val_status, v_val_msg 
    FROM public.validate_discount_code(p_discount_code, v_buyer, p_product_id, v_subtotal);
    
    IF v_val_status <> 'valid' THEN
        RAISE EXCEPTION '%', v_val_msg;
    END IF;

    SELECT * INTO v_code FROM public.discount_codes
      WHERE upper(code) = upper(trim(p_discount_code)) AND is_active = true FOR UPDATE;
    
    IF v_code.discount_type = 'fixed' THEN
        v_discount_amount := LEAST(v_code.fixed_amount, v_subtotal);
    ELSE
        v_discount_amount := round(v_subtotal * v_code.percent / 100.0, 2);
        IF v_code.max_discount_amount IS NOT NULL THEN
            v_discount_amount := LEAST(v_discount_amount, v_code.max_discount_amount);
        END IF;
    END IF;

    v_total := v_subtotal - v_discount_amount;
    UPDATE public.discount_codes SET used_count = used_count + 1 WHERE id = v_code.id;
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = v_buyer FOR UPDATE;
  IF v_balance < v_total THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - v_total WHERE id = v_buyer;
  
  IF NOT v_is_instant THEN
    UPDATE public.products SET stock = stock - p_quantity WHERE id = p_product_id;
  END IF;

  -- Platform commission is always calculated on the original price OR the price after seller-funded discount
  -- If platform-funded, commission is on subtotal.
  v_rate := public.seller_effective_commission_rate(v_product.seller_id);
  
  IF v_code.id IS NOT NULL AND v_code.funding_source = 'platform' THEN
      v_commission := round(v_subtotal * v_rate, 2);
      v_seller_net := v_subtotal - v_commission;
      -- The v_total (what buyer paid) might be less than v_seller_net + v_commission
      -- The difference is the platform's marketing cost
  ELSE
      -- Seller funded or no discount
      v_commission := round(v_total * v_rate, 2);
      v_seller_net := v_total - v_commission;
  END IF;

  INSERT INTO public.orders (buyer_id, seller_id, product_id, quantity, unit_price, total,
    commission_amount, seller_net, status, auto_confirm_at, discount_code)
  VALUES (v_buyer, v_product.seller_id, p_product_id, p_quantity, v_product.price, v_total,
    v_commission, v_seller_net,
    CASE WHEN v_is_instant THEN 'delivered'::order_status ELSE 'paid'::order_status END,
    now() + interval '24 hours', p_discount_code)
  RETURNING id INTO v_order_id;

  -- Record usage
  IF v_code.id IS NOT NULL THEN
      INSERT INTO public.campaign_usage (campaign_id, user_id, order_id, discount_amount)
      VALUES (v_code.id, v_buyer, v_order_id, v_discount_amount);
  END IF;

  -- Start conversation logic (reused from existing)
  DECLARE
    v_user_a uuid; v_user_b uuid;
  BEGIN
    IF v_buyer < v_product.seller_id THEN v_user_a := v_buyer; v_user_b := v_product.seller_id;
    ELSE v_user_a := v_product.seller_id; v_user_b := v_buyer; END IF;

    SELECT id INTO v_conv FROM public.conversations
      WHERE user_a = v_user_a AND user_b = v_user_b
      ORDER BY (product_id IS NULL) DESC, created_at ASC LIMIT 1;

    IF v_conv IS NULL THEN
      INSERT INTO public.conversations (user_a, user_b, product_id, order_id)
      VALUES (v_user_a, v_user_b, NULL, v_order_id) RETURNING id INTO v_conv;
    ELSE
      UPDATE public.conversations SET order_id = COALESCE(order_id, v_order_id), product_id = NULL WHERE id = v_conv;
    END IF;
    UPDATE public.orders SET conversation_id = v_conv WHERE id = v_order_id;
  END;

  RETURN v_order_id;
END;
$function$;

-- 6. Insert YENI10 campaign (Inactive by default)
INSERT INTO public.discount_codes (
    code, 
    campaign_name,
    percent, 
    discount_type, 
    min_subtotal, 
    max_discount_amount, 
    funding_source, 
    is_new_customer_only, 
    is_active,
    per_user_limit
)
VALUES (
    'YENI10', 
    'Yeni Müştəri Kampaniyası',
    10, 
    'percentage', 
    20.00, 
    2.00, 
    'platform', 
    true, 
    false,
    1
)
ON CONFLICT (code) DO UPDATE SET
    campaign_name = EXCLUDED.campaign_name,
    percent = EXCLUDED.percent,
    min_subtotal = EXCLUDED.min_subtotal,
    max_discount_amount = EXCLUDED.max_discount_amount,
    funding_source = EXCLUDED.funding_source,
    is_new_customer_only = EXCLUDED.is_new_customer_only,
    is_active = false; -- Keep inactive as requested
