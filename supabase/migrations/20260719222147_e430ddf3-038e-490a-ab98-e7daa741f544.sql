
CREATE OR REPLACE FUNCTION public.notify_on_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (NEW.seller_id, 'order', '🛒 Yeni sifariş', 'Məhsulunuz sifariş edildi — ' || NEW.total::text || ' ₼', '/seller-orders?open=' || NEW.id::text);
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'delivered' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.buyer_id, 'order', '📦 Sifariş çatdırıldı', 'Satıcı çatdırılmanı qeyd etdi. 24 saat ərzində təsdiq edin.', '/orders');
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.seller_id, 'order', '✅ Sifariş tamamlandı', 'Vəsait 48 saat sonra balansa köçüriləcək', '/seller-orders?open=' || NEW.id::text);
    ELSIF NEW.status = 'disputed' OR NEW.status = 'dispute' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.seller_id, 'dispute', '⚠️ Sifarişə etiraz', 'Alıcı sifarişə etiraz etdi', '/seller-orders?open=' || NEW.id::text);
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.buyer_id, 'order', '❌ Sifariş ləğv edildi', 'Vəsait balansınıza qaytarıldı', '/orders');
    ELSIF NEW.status = 'refunded' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.buyer_id, 'order', '💸 Geri qaytarıldı', 'Sifarişin pulu balansa qaytarıldı', '/orders');
    END IF;
  END IF;
  RETURN NEW;
END $function$;
