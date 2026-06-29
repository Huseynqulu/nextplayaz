
-- Messaging system: 1:1 conversations between buyers and sellers
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_order CHECK (user_a < user_b),
  CONSTRAINT unique_pair UNIQUE (user_a, user_b, product_id)
);

CREATE INDEX idx_conv_user_a ON public.conversations(user_a, last_message_at DESC);
CREATE INDEX idx_conv_user_b ON public.conversations(user_b, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read conv" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "admins read all conv" ON public.conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dm_conv ON public.dm_messages(conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.dm_messages TO authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read msgs" ON public.dm_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));

CREATE POLICY "admins read all msgs" ON public.dm_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "participants send msgs" ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  ));

CREATE POLICY "participants mark read" ON public.dm_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));

-- RPC: get or create conversation with another user (optionally about a product)
CREATE OR REPLACE FUNCTION public.start_conversation(p_other_user uuid, p_product_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid();
  v_a uuid; v_b uuid; v_id uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_other_user IS NULL OR p_other_user = v_me THEN RAISE EXCEPTION 'Invalid recipient'; END IF;

  IF v_me < p_other_user THEN v_a := v_me; v_b := p_other_user;
  ELSE v_a := p_other_user; v_b := v_me; END IF;

  SELECT id INTO v_id FROM public.conversations
    WHERE user_a = v_a AND user_b = v_b AND p_product_id IS NOT DISTINCT FROM product_id LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.conversations (user_a, user_b, product_id) VALUES (v_a, v_b, p_product_id)
    RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.start_conversation(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid, uuid) TO authenticated;

-- Trigger: bump conversation last_message_at on new message
CREATE OR REPLACE FUNCTION public.bump_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
    SET last_message_at = NEW.created_at, last_message_preview = left(NEW.body, 120)
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_bump_conv AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation();

-- Allow admin to update payment_settings (already has admin policy via existing setup? add if missing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_settings' AND cmd='UPDATE') THEN
    CREATE POLICY "admins update payment settings" ON public.payment_settings FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Enable realtime on dm_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
