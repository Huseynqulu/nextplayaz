
-- Support staff can read all conversations & messages
CREATE POLICY "support read all conv" ON public.conversations FOR SELECT
  USING (public.has_role(auth.uid(), 'support'));
CREATE POLICY "support read all msgs" ON public.dm_messages FOR SELECT
  USING (public.has_role(auth.uid(), 'support'));

-- Support staff can view & update all support tickets and post messages
CREATE POLICY "Support view all tickets" ON public.support_tickets FOR SELECT
  USING (public.has_role(auth.uid(), 'support'));
CREATE POLICY "Support update tickets" ON public.support_tickets FOR UPDATE
  USING (public.has_role(auth.uid(), 'support'));
CREATE POLICY "Support view ticket messages" ON public.support_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = support_messages.ticket_id)
         AND public.has_role(auth.uid(), 'support'));

-- Support staff can view all orders
CREATE POLICY "Support view all orders" ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'support'));

-- Cancel order RPC: refund buyer, restore stock, mark cancelled
CREATE OR REPLACE FUNCTION public.staff_cancel_order(p_order_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'support')) THEN
    RAISE EXCEPTION 'Staff only';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status IN ('completed','cancelled','refunded') THEN
    RAISE EXCEPTION 'Order cannot be cancelled in status %', v_order.status;
  END IF;

  -- Refund buyer
  UPDATE public.profiles SET wallet_balance = wallet_balance + v_order.total, updated_at = now()
    WHERE id = v_order.buyer_id;
  -- Restore stock
  UPDATE public.products SET stock = stock + v_order.quantity WHERE id = v_order.product_id;
  -- Mark cancelled
  UPDATE public.orders
    SET status = 'cancelled',
        delivery_payload = COALESCE(delivery_payload, '') ||
          E'\n[cancelled by staff ' || v_uid::text || ' at ' || now()::text ||
          CASE WHEN p_reason IS NOT NULL THEN ' — ' || p_reason ELSE '' END || ']',
        updated_at = now()
    WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.staff_cancel_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_cancel_order(uuid, text) TO authenticated;
