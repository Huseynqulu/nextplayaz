
DROP FUNCTION IF EXISTS public.admin_list_users();
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(id uuid, email text, display_name text, username text, wallet_balance numeric, roles app_role[], created_at timestamptz, verified_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  RETURN QUERY
  SELECT p.id, u.email::text, p.display_name, p.username, p.wallet_balance,
    COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::app_role[]) AS roles,
    p.created_at, p.verified_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  GROUP BY p.id, u.email, p.display_name, p.username, p.wallet_balance, p.created_at, p.verified_at
  ORDER BY p.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
