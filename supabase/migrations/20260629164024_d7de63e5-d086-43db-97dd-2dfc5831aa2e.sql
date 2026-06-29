
-- 1) ORDERS: revoke direct REST UPDATE. All mutations go through SECURITY DEFINER RPCs.
REVOKE UPDATE ON public.orders FROM authenticated;
DROP POLICY IF EXISTS "Order parties update" ON public.orders;
-- Admins still need to be able to update via REST if needed:
CREATE POLICY "Admins update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT UPDATE ON public.orders TO service_role;

-- 2) PRODUCTS: column-level UPDATE — sellers cannot touch rating/reviews_count.
REVOKE UPDATE ON public.products FROM authenticated;
GRANT UPDATE (
  title, description, price, old_price, platform, category,
  image_url, stock, delivery, is_active, auto_message,
  auto_message_enabled, slug, updated_at
) ON public.products TO authenticated;
GRANT UPDATE ON public.products TO service_role;

-- 3) PROFILES: column-level UPDATE — block wallet, loyalty, tier, sales stats, verified, referral.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  username, display_name, avatar_url, shop_name, last_seen_at, updated_at
) ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO service_role;
-- Existing "profiles owner update safe" policy still applies as the row gate.

-- 4) SUPPORT MESSAGES: prevent non-staff from posting is_admin = true.
DROP POLICY IF EXISTS "Post ticket messages" ON public.support_messages;
CREATE POLICY "Post ticket messages"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      CASE WHEN public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support')
        THEN true
        ELSE is_admin = false
      END
    )
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.user_id = auth.uid()
          OR public.has_role(auth.uid(),'admin')
          OR public.has_role(auth.uid(),'support')
        )
    )
  );

-- 5) Harden search_path on remaining functions flagged by the linter.
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
