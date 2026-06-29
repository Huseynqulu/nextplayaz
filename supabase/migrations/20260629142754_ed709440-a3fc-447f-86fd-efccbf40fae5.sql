
-- ============ BANNERS ============
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  link_url text,
  bg_color text DEFAULT '#0a0a0a',
  text_color text DEFAULT '#ffffff',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.banners TO anon, authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active banners" ON public.banners
  FOR SELECT USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );
CREATE POLICY "Admins manage banners" ON public.banners
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER banners_updated_at BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin RPCs
CREATE OR REPLACE FUNCTION public.admin_upsert_banner(
  p_id uuid, p_title text, p_subtitle text, p_image_url text, p_link_url text,
  p_bg_color text, p_text_color text, p_sort_order int, p_is_active boolean,
  p_starts_at timestamptz, p_ends_at timestamptz
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.banners(title,subtitle,image_url,link_url,bg_color,text_color,sort_order,is_active,starts_at,ends_at)
    VALUES (p_title,p_subtitle,p_image_url,p_link_url,COALESCE(p_bg_color,'#0a0a0a'),COALESCE(p_text_color,'#ffffff'),COALESCE(p_sort_order,0),COALESCE(p_is_active,true),p_starts_at,p_ends_at)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.banners SET title=p_title, subtitle=p_subtitle, image_url=p_image_url, link_url=p_link_url,
      bg_color=COALESCE(p_bg_color,bg_color), text_color=COALESCE(p_text_color,text_color),
      sort_order=COALESCE(p_sort_order,sort_order), is_active=COALESCE(p_is_active,is_active),
      starts_at=p_starts_at, ends_at=p_ends_at, updated_at=now()
    WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_banner(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  DELETE FROM public.banners WHERE id=p_id;
END $$;

-- ============ REFERRALS ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

-- Generate unique short codes for existing profiles
CREATE OR REPLACE FUNCTION public._gen_ref_code() RETURNS text LANGUAGE sql AS $$
  SELECT upper(substring(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;

UPDATE public.profiles SET referral_code = public._gen_ref_code() WHERE referral_code IS NULL;

-- Trigger to auto-assign code on new profile
CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public._gen_ref_code();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_assign_ref_code ON public.profiles;
CREATE TRIGGER profiles_assign_ref_code BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_referral_code();

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending | rewarded
  reward_amount numeric(10,2) NOT NULL DEFAULT 2.00,
  qualifying_order_id uuid REFERENCES public.orders(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz
);

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referee_id = auth.uid());
CREATE POLICY "Admins view all referrals" ON public.referrals
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- Redeem referral code on signup (called from client after register)
CREATE OR REPLACE FUNCTION public.redeem_referral_signup(p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid(); v_ref uuid; v_own text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN RETURN; END IF;

  SELECT referral_code INTO v_own FROM public.profiles WHERE id = v_uid;
  IF upper(trim(p_code)) = v_own THEN RAISE EXCEPTION 'Öz kodunuzu istifadə edə bilməzsiniz'; END IF;

  -- already linked?
  IF (SELECT referred_by FROM public.profiles WHERE id = v_uid) IS NOT NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_id = v_uid) THEN RETURN; END IF;

  SELECT id INTO v_ref FROM public.profiles WHERE upper(referral_code) = upper(trim(p_code));
  IF v_ref IS NULL THEN RAISE EXCEPTION 'Referal kodu tapılmadı'; END IF;
  IF v_ref = v_uid THEN RAISE EXCEPTION 'Öz kodunuzu istifadə edə bilməzsiniz'; END IF;

  UPDATE public.profiles SET referred_by = v_ref WHERE id = v_uid;
  INSERT INTO public.referrals (referrer_id, referee_id) VALUES (v_ref, v_uid);
END $$;

-- Reward both parties when referee completes their first order
CREATE OR REPLACE FUNCTION public.process_referral_reward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ref public.referrals%ROWTYPE;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN RETURN NEW; END IF;
  SELECT * INTO v_ref FROM public.referrals
    WHERE referee_id = NEW.buyer_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance + v_ref.reward_amount WHERE id = v_ref.referrer_id;
  UPDATE public.profiles SET wallet_balance = wallet_balance + v_ref.reward_amount WHERE id = v_ref.referee_id;
  UPDATE public.referrals SET status='rewarded', qualifying_order_id = NEW.id, rewarded_at = now()
    WHERE id = v_ref.id;

  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (v_ref.referrer_id, 'referral', '🎁 Referal bonusu!', 'Dəvət etdiyiniz istifadəçi ilk sifarişini tamamladı. ' || v_ref.reward_amount::text || ' ₼ balansınıza əlavə olundu.', '/profile');
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (v_ref.referee_id, 'referral', '🎁 Xoş gəldin bonusu!', 'İlk sifarişin üçün təşəkkürlər! ' || v_ref.reward_amount::text || ' ₼ hədiyyə qazandın.', '/profile');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS process_referral_on_order_complete ON public.orders;
CREATE TRIGGER process_referral_on_order_complete
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.process_referral_reward();

-- Stats RPC for the referral page
CREATE OR REPLACE FUNCTION public.get_referral_stats()
RETURNS TABLE(total_invited bigint, rewarded_count bigint, total_earned numeric, code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT
    (SELECT count(*) FROM public.referrals WHERE referrer_id = auth.uid())::bigint,
    (SELECT count(*) FROM public.referrals WHERE referrer_id = auth.uid() AND status='rewarded')::bigint,
    COALESCE((SELECT sum(reward_amount) FROM public.referrals WHERE referrer_id = auth.uid() AND status='rewarded'),0)::numeric,
    (SELECT referral_code FROM public.profiles WHERE id = auth.uid());
$$;

-- Seed one demo banner
INSERT INTO public.banners (title, subtitle, bg_color, text_color, sort_order, link_url)
VALUES ('Dostunu dəvət et — 2 ₼ qazan!', 'Hər uğurlu dəvətdə həm sən, həm dostun bonus alır.', '#0f172a', '#ffffff', 1, '/referrals');
