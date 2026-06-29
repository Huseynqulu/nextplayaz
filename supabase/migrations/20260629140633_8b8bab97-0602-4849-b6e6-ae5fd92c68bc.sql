
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify on new DM message
CREATE OR REPLACE FUNCTION public.notify_on_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv public.conversations%ROWTYPE; v_other uuid; v_title text;
BEGIN
  SELECT * INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  v_other := CASE WHEN v_conv.user_a = NEW.sender_id THEN v_conv.user_b ELSE v_conv.user_a END;
  IF v_other IS NULL OR v_other = NEW.sender_id THEN RETURN NEW; END IF;
  v_title := CASE WHEN NEW.kind = 'system' THEN 'Sistem bildirişi' ELSE 'Yeni mesaj' END;
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (v_other, 'message', v_title, left(coalesce(NEW.body,''), 140), '/messages?c=' || NEW.conversation_id::text);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_dm ON public.dm_messages;
CREATE TRIGGER trg_notify_dm AFTER INSERT ON public.dm_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_dm();

-- Trigger: notify on order events
CREATE OR REPLACE FUNCTION public.notify_on_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (NEW.seller_id, 'order', '🛒 Yeni sifariş', 'Məhsulunuz sifariş edildi — ' || NEW.total::text || ' ₼', '/orders');
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'delivered' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.buyer_id, 'order', '📦 Sifariş çatdırıldı', 'Satıcı çatdırılmanı qeyd etdi. 24 saat ərzində təsdiq edin.', '/orders');
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.seller_id, 'order', '✅ Sifariş tamamlandı', 'Vəsait 48 saat sonra balansa köçüriləcək', '/orders');
    ELSIF NEW.status = 'disputed' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.seller_id, 'dispute', '⚠️ Sifarişə etiraz', 'Alıcı sifarişə etiraz etdi', '/orders');
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.buyer_id, 'order', '❌ Sifariş ləğv edildi', 'Vəsait balansınıza qaytarıldı', '/orders');
    ELSIF NEW.status = 'refunded' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.buyer_id, 'order', '💸 Geri qaytarıldı', 'Sifarişin pulu balansa qaytarıldı', '/orders');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_order_ins ON public.orders;
DROP TRIGGER IF EXISTS trg_notify_order_upd ON public.orders;
CREATE TRIGGER trg_notify_order_ins AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_on_order();
CREATE TRIGGER trg_notify_order_upd AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_on_order();

-- Mark notifications read RPC
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids uuid[] DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF p_ids IS NULL THEN
    UPDATE public.notifications SET read_at = now()
      WHERE user_id = auth.uid() AND read_at IS NULL;
  ELSE
    UPDATE public.notifications SET read_at = now()
      WHERE user_id = auth.uid() AND id = ANY(p_ids) AND read_at IS NULL;
  END IF;
END $$;
