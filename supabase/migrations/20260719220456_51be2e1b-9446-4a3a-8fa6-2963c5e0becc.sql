-- Lock loyalty_points from self-modification in profiles owner update policy
DROP POLICY IF EXISTS "profiles owner update safe" ON public.profiles;

CREATE POLICY "profiles owner update safe" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND NOT (wallet_balance IS DISTINCT FROM (SELECT p.wallet_balance FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (referral_code IS DISTINCT FROM (SELECT p.referral_code FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (referred_by IS DISTINCT FROM (SELECT p.referred_by FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (seller_tier IS DISTINCT FROM (SELECT p.seller_tier FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (verified_at IS DISTINCT FROM (SELECT p.verified_at FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (commission_rate_override IS DISTINCT FROM (SELECT p.commission_rate_override FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (banned_at IS DISTINCT FROM (SELECT p.banned_at FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (ban_reason IS DISTINCT FROM (SELECT p.ban_reason FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (suspended_until IS DISTINCT FROM (SELECT p.suspended_until FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (suspend_reason IS DISTINCT FROM (SELECT p.suspend_reason FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (sales_count IS DISTINCT FROM (SELECT p.sales_count FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (sales_total IS DISTINCT FROM (SELECT p.sales_total FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (loyalty_points IS DISTINCT FROM (SELECT p.loyalty_points FROM profiles p WHERE p.id = auth.uid()))
);

-- Prevent reviewers from setting/altering seller_reply fields on their own reviews.
-- Split UPDATE policy: reviewer can update their content but not the seller-reply columns;
-- admin retains full update.
DROP POLICY IF EXISTS "Users update own reviews" ON public.reviews;

CREATE POLICY "Reviewer updates own review (no seller_reply)" ON public.reviews
FOR UPDATE
USING (auth.uid() = reviewer_id)
WITH CHECK (
  auth.uid() = reviewer_id
  AND NOT (seller_reply IS DISTINCT FROM (SELECT r.seller_reply FROM public.reviews r WHERE r.id = reviews.id))
  AND NOT (seller_replied_at IS DISTINCT FROM (SELECT r.seller_replied_at FROM public.reviews r WHERE r.id = reviews.id))
);

CREATE POLICY "Admins update any review" ON public.reviews
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));