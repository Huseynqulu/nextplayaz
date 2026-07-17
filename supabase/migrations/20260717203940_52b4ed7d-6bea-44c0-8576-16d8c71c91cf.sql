
CREATE TABLE public.topup_payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (amount)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.topup_payment_links TO authenticated;
GRANT ALL ON public.topup_payment_links TO service_role;

ALTER TABLE public.topup_payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users view active links" ON public.topup_payment_links
  FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins manage links" ON public.topup_payment_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_topup_links_updated_at
  BEFORE UPDATE ON public.topup_payment_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.wallet_topups
  ADD COLUMN IF NOT EXISTS reference_code text;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_topups_reference_code_idx
  ON public.wallet_topups (reference_code) WHERE reference_code IS NOT NULL;
