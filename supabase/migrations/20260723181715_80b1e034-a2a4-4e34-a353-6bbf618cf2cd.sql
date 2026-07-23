DROP POLICY "participants send msgs" ON public.dm_messages;
CREATE POLICY "participants send msgs" ON public.dm_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND kind = 'user'
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = dm_messages.conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
);