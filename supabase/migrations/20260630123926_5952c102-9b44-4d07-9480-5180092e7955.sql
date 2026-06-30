
DROP POLICY IF EXISTS "Users close own tickets" ON public.support_tickets;

CREATE OR REPLACE FUNCTION public.close_support_ticket(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.support_tickets
    SET status = 'closed', updated_at = now()
    WHERE id = p_ticket_id AND user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.close_support_ticket(uuid) TO authenticated;
