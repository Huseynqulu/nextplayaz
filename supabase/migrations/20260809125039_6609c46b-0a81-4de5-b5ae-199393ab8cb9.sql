BEGIN;
DROP POLICY "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = id AND
    wallet_balance = 0 AND
    seller_tier = 'standard' AND
    verified_at IS NULL AND
    banned_at IS NULL AND
    suspended_until IS NULL AND
    sales_count = 0 AND
    sales_total = 0 AND
    loyalty_points = 0 AND
    commission_rate_override IS NULL
);
COMMIT;