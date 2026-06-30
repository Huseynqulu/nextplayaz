DROP POLICY IF EXISTS "Buyers view delivered stock items" ON public.product_stock_items;
CREATE POLICY "Buyers view delivered stock items" ON public.product_stock_items
FOR SELECT TO authenticated
USING (
  order_id IS NOT NULL
  AND delivered_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = product_stock_items.order_id
      AND o.buyer_id = auth.uid()
      AND o.status IN ('delivered','completed','disputed','refunded')
  )
);