CREATE TABLE public.support_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','live','closed')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_chats TO authenticated;
GRANT ALL ON public.support_chats TO service_role;
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own support chats" ON public.support_chats FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE POLICY "Owners create own support chats" ON public.support_chats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'waiting' AND assigned_to IS NULL);
CREATE POLICY "Staff update support chats" ON public.support_chats FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE INDEX support_chats_user_idx ON public.support_chats(user_id, created_at DESC);
CREATE INDEX support_chats_status_idx ON public.support_chats(status, updated_at DESC);

CREATE TABLE public.support_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','staff','system')),
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 8000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_chat_messages TO authenticated;
GRANT ALL ON public.support_chat_messages TO service_role;
ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View messages of accessible chats" ON public.support_chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_chats c WHERE c.id = chat_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'))));
CREATE POLICY "Customers write to own open chats" ON public.support_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND role IN ('user','assistant','system')
    AND EXISTS (SELECT 1 FROM public.support_chats c WHERE c.id = chat_id AND c.user_id = auth.uid() AND c.status <> 'closed')
  );
CREATE POLICY "Staff write staff messages" ON public.support_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND role IN ('staff','system')
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'))
  );
CREATE INDEX support_chat_messages_chat_idx ON public.support_chat_messages(chat_id, created_at);

CREATE OR REPLACE FUNCTION public.touch_support_chat() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.support_chats SET updated_at = now() WHERE id = NEW.chat_id;
  RETURN NEW;
END $$;
CREATE TRIGGER support_chat_messages_touch AFTER INSERT ON public.support_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_support_chat();

ALTER TABLE public.support_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.support_chats REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;