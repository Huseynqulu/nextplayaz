DROP POLICY "Sellers update own products" ON public.products;
CREATE POLICY "Sellers update own products" ON public.products
FOR UPDATE
USING (auth.uid() = seller_id)
WITH CHECK (
  auth.uid() = seller_id
  AND rating = (SELECT p2.rating FROM products p2 WHERE p2.id = products.id)
  AND reviews_count = (SELECT p2.reviews_count FROM products p2 WHERE p2.id = products.id)
  AND boost_tier IS NOT DISTINCT FROM (SELECT p2.boost_tier FROM products p2 WHERE p2.id = products.id)
  AND boost_expires_at IS NOT DISTINCT FROM (SELECT p2.boost_expires_at FROM products p2 WHERE p2.id = products.id)
);