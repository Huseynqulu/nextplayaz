-- 1) Lock down product UPDATE: prevent sellers from modifying rating/reviews_count
DROP POLICY IF EXISTS "Sellers update own products" ON public.products;
CREATE POLICY "Sellers update own products" ON public.products
  FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (
    auth.uid() = seller_id
    AND rating = (SELECT rating FROM public.products p2 WHERE p2.id = products.id)
    AND reviews_count = (SELECT reviews_count FROM public.products p2 WHERE p2.id = products.id)
  );

-- 2) payment_settings: restrict reads to authenticated users only
DROP POLICY IF EXISTS "anyone read active payment settings" ON public.payment_settings;
CREATE POLICY "Authenticated read active payment settings" ON public.payment_settings
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 3) reviews: require completed order before allowing insert
DROP POLICY IF EXISTS "Users create own reviews" ON public.reviews;
CREATE POLICY "Users create own reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.buyer_id = auth.uid()
        AND o.product_id = reviews.product_id
        AND o.status = 'completed'
    )
  );
