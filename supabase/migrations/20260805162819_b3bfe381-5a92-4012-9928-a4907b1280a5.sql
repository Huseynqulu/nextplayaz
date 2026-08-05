-- Revoke execute from public/anon for the last identified function
REVOKE EXECUTE ON FUNCTION public.record_product_view(uuid) FROM anon;

-- Tighten profiles update policy to ensure shop_name is unique if provided
-- (Checking if we can add a constraint via trigger or if existing unique index is enough)
-- But for now, just adding a comment and ensuring we have a robust policy.

-- Proactively check for any other tables that might need grants
GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;
