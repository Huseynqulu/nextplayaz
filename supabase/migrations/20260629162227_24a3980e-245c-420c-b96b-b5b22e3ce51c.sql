
-- Gift cards table
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  is_active boolean NOT NULL DEFAULT true,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_cards TO authenticated;
GRANT ALL ON public.gift_cards TO service_role;

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

-- Only admins can read the full table directly; users redeem via RPC.
CREATE POLICY "Admins can view all gift cards" ON public.gift_cards
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_updated_at_gift_cards
  BEFORE UPDATE ON public.gift_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON public.gift_cards (upper(code));

-- Helper: generate a random readable code like NXT-AB12-CD34
CREATE OR REPLACE FUNCTION public._gen_gift_code()
RETURNS text LANGUAGE sql SET search_path = public AS $$
  SELECT 'NXT-' ||
    upper(substring(md5(random()::text || clock_timestamp()::text), 1, 4)) || '-' ||
    upper(substring(md5(random()::text || clock_timestamp()::text), 1, 4));
$$;

-- Admin: create one or more gift card codes
CREATE OR REPLACE FUNCTION public.admin_create_gift_cards(
  p_amount numeric, p_quantity int DEFAULT 1, p_note text DEFAULT NULL
)
RETURNS SETOF public.gift_cards
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_i int; v_code text;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF p_quantity < 1 OR p_quantity > 200 THEN RAISE EXCEPTION 'Quantity must be 1-200'; END IF;
  FOR v_i IN 1..p_quantity LOOP
    LOOP
      v_code := public._gen_gift_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.gift_cards WHERE code = v_code);
    END LOOP;
    RETURN QUERY
      INSERT INTO public.gift_cards (code, amount, created_by, note)
      VALUES (v_code, p_amount, v_admin, p_note)
      RETURNING *;
  END LOOP;
END $$;

-- Admin: deactivate a gift card
CREATE OR REPLACE FUNCTION public.admin_deactivate_gift_card(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.gift_cards SET is_active = false, updated_at = now()
    WHERE id = p_id AND redeemed_by IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Gift card not found or already redeemed'; END IF;
END $$;

-- User: redeem a gift card code into their wallet
CREATE OR REPLACE FUNCTION public.redeem_gift_card(p_code text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_card public.gift_cards%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN RAISE EXCEPTION 'Invalid code'; END IF;

  SELECT * INTO v_card FROM public.gift_cards
    WHERE upper(code) = upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kod tapılmadı'; END IF;
  IF NOT v_card.is_active THEN RAISE EXCEPTION 'Bu kod aktiv deyil'; END IF;
  IF v_card.redeemed_by IS NOT NULL THEN RAISE EXCEPTION 'Bu kod artıq istifadə edilib'; END IF;

  UPDATE public.gift_cards
    SET redeemed_by = v_uid, redeemed_at = now(), is_active = false, updated_at = now()
    WHERE id = v_card.id;

  UPDATE public.profiles SET wallet_balance = wallet_balance + v_card.amount, updated_at = now()
    WHERE id = v_uid;

  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (v_uid, 'wallet', '🎁 Hədiyyə kartı', 'Balansınıza ' || v_card.amount::text || ' ₼ əlavə olundu.', '/wallet');

  RETURN v_card.amount;
END $$;
