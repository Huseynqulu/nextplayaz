-- Restrict sellers from modifying/deleting delivered stock items
DROP POLICY IF EXISTS "Sellers manage own stock items" ON public.product_stock_items;

-- SELECT: sellers can view all their own stock (delivered or not) for records
CREATE POLICY "Sellers select own stock items"
ON public.product_stock_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_stock_items.product_id
      AND p.seller_id = auth.uid()
  )
);

-- INSERT: sellers can add new stock (must be unassigned)
CREATE POLICY "Sellers insert own stock items"
ON public.product_stock_items
FOR INSERT
TO authenticated
WITH CHECK (
  order_id IS NULL
  AND delivered_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_stock_items.product_id
      AND p.seller_id = auth.uid()
  )
);

-- UPDATE: sellers can only edit unassigned stock, and cannot assign it themselves
CREATE POLICY "Sellers update own unassigned stock items"
ON public.product_stock_items
FOR UPDATE
TO authenticated
USING (
  order_id IS NULL
  AND delivered_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_stock_items.product_id
      AND p.seller_id = auth.uid()
  )
)
WITH CHECK (
  order_id IS NULL
  AND delivered_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_stock_items.product_id
      AND p.seller_id = auth.uid()
  )
);

-- DELETE: sellers can only delete unassigned stock
CREATE POLICY "Sellers delete own unassigned stock items"
ON public.product_stock_items
FOR DELETE
TO authenticated
USING (
  order_id IS NULL
  AND delivered_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_stock_items.product_id
      AND p.seller_id = auth.uid()
  )
);