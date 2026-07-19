-- Remove direct INSERT policies; creation is only allowed via SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "Buyers create orders" ON public.orders;
DROP POLICY IF EXISTS "buyers insert own order payments" ON public.order_payments;