
-- Fix boost_product (use correct platform_ledger columns) and add admin-managed boost pricing
CREATE TABLE IF NOT EXISTS public.boost_pricing (
  hours integer PRIMARY KEY,
  cost numeric NOT NULL CHECK (cost >= 0),
  tier text NOT NULL,
  label text NOT NULL,
  sub_label text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.boost_pricing TO anon, authenticated;
GRANT ALL ON public.boost_pricing TO service_role;

ALTER TABLE public.boost_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone read active boost pricing" ON public.boost_pricing;
CREATE POLICY "anyone read active boost pricing" ON public.boost_pricing
  FOR SELECT USING (true);

-- Seed defaults
INSERT INTO public.boost_pricing (hours, cost, tier, label, sub_label, sort_order) VALUES
  (24,  5,  'standard', 'Standart', '24 saat öndə', 1),
  (72,  12, 'plus',     'Plus',     '3 gün öndə',   2),
  (168, 25, 'premium',  'Premium',  '7 gün öndə',   3)
ON CONFLICT (hours) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_upsert_boost_pricing(
  p_hours integer, p_cost numeric, p_tier text, p_label text, p_sub_label text, p_sort_order integer, p_is_active boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  INSERT INTO public.boost_pricing(hours, cost, tier, label, sub_label, sort_order, is_active)
  VALUES (p_hours, p_cost, p_tier, p_label, p_sub_label, COALESCE(p_sort_order,0), COALESCE(p_is_active,true))
  ON CONFLICT (hours) DO UPDATE SET
    cost = EXCLUDED.cost, tier = EXCLUDED.tier, label = EXCLUDED.label,
    sub_label = EXCLUDED.sub_label, sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_boost_pricing(p_hours integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  DELETE FROM public.boost_pricing WHERE hours = p_hours;
END $$;

-- Fix boost_product to use real platform_ledger columns and DB-driven pricing
CREATE OR REPLACE FUNCTION public.boost_product(_product_id uuid, _hours integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid UUID := auth.uid(); _seller UUID; _cost NUMERIC; _bal NUMERIC; _tier TEXT; _new_expiry TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT seller_id INTO _seller FROM public.products WHERE id = _product_id;
  IF _seller IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF _seller <> _uid THEN RAISE EXCEPTION 'Only owner can boost'; END IF;

  SELECT cost, tier INTO _cost, _tier
    FROM public.boost_pricing WHERE hours = _hours AND is_active = true;
  IF _cost IS NULL THEN RAISE EXCEPTION 'Invalid or inactive boost duration'; END IF;

  SELECT wallet_balance INTO _bal FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _bal < _cost THEN RAISE EXCEPTION 'Yetərli balans yoxdur'; END IF;

  _new_expiry := GREATEST(COALESCE((SELECT boost_expires_at FROM public.products WHERE id=_product_id), now()), now()) + (_hours || ' hours')::interval;
  UPDATE public.profiles SET wallet_balance = wallet_balance - _cost WHERE id = _uid;
  UPDATE public.products SET boost_expires_at = _new_expiry, boost_tier = _tier WHERE id = _product_id;

  INSERT INTO public.platform_ledger (entry_type, amount, user_id, notes)
    VALUES ('boost', _cost, _uid, 'Product boost ' || _hours || 'h (' || _product_id::text || ')');

  RETURN jsonb_build_object('ok', true, 'expires_at', _new_expiry, 'cost', _cost);
END; $function$;
