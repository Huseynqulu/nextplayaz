CREATE OR REPLACE FUNCTION public.notify_seller_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (NEW.seller_id, 'order', '🛒 Yeni sifariş', 'Məhsulunuz sifariş edildi — ' || NEW.total::text || ' ₼', '/seller-orders');
  RETURN NEW;
END;
$$;