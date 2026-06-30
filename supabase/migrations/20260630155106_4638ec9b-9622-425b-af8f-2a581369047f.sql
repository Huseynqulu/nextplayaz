
CREATE OR REPLACE FUNCTION public.user_avg_response_minutes(p_user uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ordered AS (
    SELECT
      m.conversation_id,
      m.sender_id,
      m.created_at,
      LAG(m.sender_id)  OVER (PARTITION BY m.conversation_id ORDER BY m.created_at) AS prev_sender,
      LAG(m.created_at) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at) AS prev_at
    FROM public.dm_messages m
    WHERE m.created_at > now() - interval '60 days'
      AND m.conversation_id IN (
        SELECT id FROM public.conversations
        WHERE user_a = p_user OR user_b = p_user
      )
  )
  SELECT ROUND(
    AVG(EXTRACT(EPOCH FROM (created_at - prev_at)) / 60.0)::numeric
  , 1)
  FROM ordered
  WHERE sender_id = p_user
    AND prev_sender IS NOT NULL
    AND prev_sender <> p_user
    AND (created_at - prev_at) < interval '24 hours'
    AND (created_at - prev_at) > interval '0 seconds';
$$;

GRANT EXECUTE ON FUNCTION public.user_avg_response_minutes(uuid) TO anon, authenticated;
