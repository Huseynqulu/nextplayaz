ALTER TABLE public.dm_messages DROP CONSTRAINT IF EXISTS dm_messages_body_check;
ALTER TABLE public.dm_messages ADD CONSTRAINT dm_messages_body_check CHECK (
  (body IS NOT NULL AND length(body) > 0) OR (attachment_url IS NOT NULL AND length(attachment_url) > 0)
);