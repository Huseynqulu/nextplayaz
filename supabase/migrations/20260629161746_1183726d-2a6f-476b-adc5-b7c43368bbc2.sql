
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boost_tier TEXT;
CREATE INDEX IF NOT EXISTS idx_products_boost ON public.products (boost_expires_at DESC NULLS LAST) WHERE is_active = true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seller_tier TEXT NOT NULL DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS sales_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_total NUMERIC(12,2) NOT NULL DEFAULT 0;

DROP VIEW IF EXISTS public.public_profiles CASCADE;
CREATE VIEW public.public_profiles AS
SELECT id, username, display_name, shop_name, avatar_url, created_at, last_seen_at,
       seller_tier, sales_count
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.compute_seller_tier(_sales_count INT, _avg_rating NUMERIC)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _sales_count >= 200 AND _avg_rating >= 4.7 THEN 'platinum'
    WHEN _sales_count >= 75  AND _avg_rating >= 4.5 THEN 'gold'
    WHEN _sales_count >= 20  AND _avg_rating >= 4.2 THEN 'silver'
    ELSE 'bronze'
  END;
$$;

CREATE OR REPLACE FUNCTION public.tier_commission_rate(_tier TEXT)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _tier
    WHEN 'platinum' THEN 0.02
    WHEN 'gold'     THEN 0.03
    WHEN 'silver'   THEN 0.04
    ELSE                 0.05
  END;
$$;

CREATE OR REPLACE FUNCTION public.recalc_seller_tier(_seller_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count INT; _total NUMERIC; _avg NUMERIC; _tier TEXT;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(total),0) INTO _count, _total
    FROM public.orders
    WHERE seller_id = _seller_id AND status::text IN ('delivered','completed');
  SELECT COALESCE(AVG(r.rating), 5.0) INTO _avg
    FROM public.reviews r JOIN public.products p ON p.id = r.product_id
    WHERE p.seller_id = _seller_id;
  _tier := public.compute_seller_tier(_count, _avg);
  UPDATE public.profiles
    SET sales_count = _count, sales_total = _total, seller_tier = _tier
    WHERE id = _seller_id;
END; $$;

CREATE OR REPLACE FUNCTION public.boost_product(_product_id UUID, _hours INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _seller UUID; _cost NUMERIC; _bal NUMERIC; _tier TEXT; _new_expiry TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT seller_id INTO _seller FROM public.products WHERE id = _product_id;
  IF _seller IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF _seller <> _uid THEN RAISE EXCEPTION 'Only owner can boost'; END IF;
  _cost := CASE _hours WHEN 24 THEN 5 WHEN 72 THEN 12 WHEN 168 THEN 25 ELSE NULL END;
  IF _cost IS NULL THEN RAISE EXCEPTION 'Invalid duration'; END IF;
  SELECT wallet_balance INTO _bal FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _bal < _cost THEN RAISE EXCEPTION 'Yetərli balans yoxdur'; END IF;
  _tier := CASE WHEN _hours >= 168 THEN 'premium' WHEN _hours >= 72 THEN 'plus' ELSE 'standard' END;
  _new_expiry := GREATEST(COALESCE((SELECT boost_expires_at FROM public.products WHERE id=_product_id), now()), now()) + (_hours || ' hours')::interval;
  UPDATE public.profiles SET wallet_balance = wallet_balance - _cost WHERE id = _uid;
  UPDATE public.products SET boost_expires_at = _new_expiry, boost_tier = _tier WHERE id = _product_id;
  INSERT INTO public.platform_ledger (kind, amount, ref_user, note)
    VALUES ('boost', _cost, _uid, 'Product boost ' || _hours || 'h');
  RETURN jsonb_build_object('ok', true, 'expires_at', _new_expiry, 'cost', _cost);
END; $$;

GRANT EXECUTE ON FUNCTION public.boost_product(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_seller_tier(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_recalc_seller_tier()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.seller_id IS NOT NULL AND NEW.status::text IN ('delivered','completed') THEN
    PERFORM public.recalc_seller_tier(NEW.seller_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_recalc_tier ON public.orders;
CREATE TRIGGER orders_recalc_tier
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_seller_tier();

DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT DISTINCT seller_id FROM public.orders WHERE seller_id IS NOT NULL LOOP
    PERFORM public.recalc_seller_tier(r.seller_id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_recent_sales(_limit INT DEFAULT 10)
RETURNS TABLE(order_id UUID, product_title TEXT, product_slug TEXT, buyer_name TEXT, price NUMERIC, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, p.title, p.slug,
         COALESCE(NULLIF(pr.display_name, ''), pr.username, 'İstifadəçi') AS buyer_name,
         o.total, o.created_at
  FROM public.orders o
  JOIN public.products p ON p.id = o.product_id
  LEFT JOIN public.profiles pr ON pr.id = o.buyer_id
  WHERE o.status::text IN ('delivered','completed','escrow','disputed')
  ORDER BY o.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 30));
$$;
GRANT EXECUTE ON FUNCTION public.get_recent_sales(INT) TO anon, authenticated;
