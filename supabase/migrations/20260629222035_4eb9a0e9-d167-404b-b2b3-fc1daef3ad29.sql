
DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  display_name text,
  avatar_url text,
  wallet_balance numeric,
  verified_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz,
  last_ip text,
  last_ip_at timestamptz,
  signup_ip text,
  banned_at timestamptz,
  ban_reason text,
  roles text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  RETURN QUERY
  SELECT
    p.id,
    u.email::text,
    p.username,
    p.display_name,
    p.avatar_url,
    p.wallet_balance,
    p.verified_at,
    p.last_seen_at,
    p.created_at,
    p.last_ip,
    p.last_ip_at,
    p.signup_ip,
    p.banned_at,
    p.ban_reason,
    COALESCE(ARRAY_AGG(ur.role::text) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::text[]) AS roles
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  GROUP BY p.id, u.email, p.username, p.display_name, p.avatar_url, p.wallet_balance,
           p.verified_at, p.last_seen_at, p.created_at, p.last_ip, p.last_ip_at,
           p.signup_ip, p.banned_at, p.ban_reason
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
