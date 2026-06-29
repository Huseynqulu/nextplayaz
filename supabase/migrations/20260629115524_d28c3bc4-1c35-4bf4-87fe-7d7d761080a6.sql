
-- Enum for status and method
DO $$ BEGIN
  CREATE TYPE public.topup_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.topup_method AS ENUM ('m10', 'kapital', 'birbank', 'pasha', 'bank_transfer', 'card', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method public.topup_method NOT NULL,
  sender_note text,
  receipt_url text,
  status public.topup_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.wallet_topups TO authenticated;
GRANT ALL ON public.wallet_topups TO service_role;

ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own topups" ON public.wallet_topups
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users create own topups" ON public.wallet_topups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "admins update topups" ON public.wallet_topups
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_topups_updated_at
  BEFORE UPDATE ON public.wallet_topups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Settings table for payment instructions (admin manages)
CREATE TABLE IF NOT EXISTS public.payment_settings (
  method public.topup_method PRIMARY KEY,
  label text NOT NULL,
  instructions text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_settings TO authenticated, anon;
GRANT ALL ON public.payment_settings TO service_role, authenticated;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read active payment settings" ON public.payment_settings
  FOR SELECT USING (true);

CREATE POLICY "admins manage payment settings" ON public.payment_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default methods
INSERT INTO public.payment_settings (method, label, instructions) VALUES
  ('m10', 'm10', 'm10 nömrəsi: +994 XX XXX XX XX\nQeyddə öz email/istifadəçi adınızı yazın.'),
  ('kapital', 'Kapital Bank kartı', 'Kart nömrəsi: 4169 XXXX XXXX XXXX\nAd: NextPlay MMC'),
  ('birbank', 'Birbank', 'Kart nömrəsi: 4127 XXXX XXXX XXXX'),
  ('pasha', 'Pasha Bank', 'Hesab: AZ00 PAHA XXXX XXXX'),
  ('bank_transfer', 'Bank köçürməsi (IBAN)', 'IBAN: AZ00 NABZ XXXX XXXX\nVÖEN: XXXXXXXXX')
ON CONFLICT (method) DO NOTHING;

-- Admin RPC to approve a topup atomically
CREATE OR REPLACE FUNCTION public.admin_approve_topup(p_topup_id uuid, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_row public.wallet_topups%ROWTYPE;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_row FROM public.wallet_topups WHERE id = p_topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Topup not found'; END IF;
  IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance + v_row.amount, updated_at = now()
    WHERE id = v_row.user_id;

  UPDATE public.wallet_topups
    SET status = 'approved', admin_notes = p_notes, reviewed_by = v_admin, reviewed_at = now(), updated_at = now()
    WHERE id = p_topup_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_topup(p_topup_id uuid, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.wallet_topups
    SET status = 'rejected', admin_notes = p_notes, reviewed_by = v_admin, reviewed_at = now(), updated_at = now()
    WHERE id = p_topup_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Topup not found or already processed'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_topup(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reject_topup(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_topup(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_topup(uuid, text) TO authenticated;
