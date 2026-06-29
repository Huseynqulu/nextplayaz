
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dispute_evidence_url text,
  ADD COLUMN IF NOT EXISTS dispute_evidence_path text;

CREATE OR REPLACE FUNCTION public.dispute_order(
  p_order_id uuid,
  p_reason text,
  p_evidence_url text DEFAULT NULL,
  p_evidence_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_has_url boolean := p_evidence_url IS NOT NULL AND length(trim(p_evidence_url)) > 5;
  v_has_path boolean := p_evidence_path IS NOT NULL AND length(trim(p_evidence_path)) > 0;
  v_url_ok boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'Səbəb minimum 5 simvol olmalıdır';
  END IF;

  IF NOT v_has_url AND NOT v_has_path THEN
    RAISE EXCEPTION 'Etiraz üçün video linki (Streamable və s.) və ya ekran görüntüsü mütləq əlavə edilməlidir';
  END IF;

  IF v_has_url THEN
    v_url_ok := lower(trim(p_evidence_url)) ~ '^https?://[^ ]{8,}';
    IF NOT v_url_ok THEN
      RAISE EXCEPTION 'Video linki düzgün deyil (https://... formatında olmalıdır)';
    END IF;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.buyer_id <> v_uid THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status NOT IN ('paid','delivered') THEN
    RAISE EXCEPTION 'Bu sifarişə etiraz edilə bilməz';
  END IF;

  UPDATE public.orders
    SET status = 'disputed',
        disputed_at = now(),
        disputed_reason = p_reason,
        dispute_evidence_url = NULLIF(trim(p_evidence_url), ''),
        dispute_evidence_path = NULLIF(trim(p_evidence_path), ''),
        auto_confirm_at = NULL,
        updated_at = now()
    WHERE id = p_order_id;

  IF v_order.conversation_id IS NOT NULL THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_order.conversation_id, v_uid,
      '⚠️ Alıcı sifarişə etiraz etdi. Admin baxacaq.' ||
      E'\nSəbəb: ' || p_reason ||
      CASE WHEN v_has_url THEN E'\n🎥 Video sübut: ' || trim(p_evidence_url) ELSE '' END ||
      CASE WHEN v_has_path THEN E'\n🖼 Ekran görüntüsü əlavə edildi' ELSE '' END,
      'system');

    -- Attach the screenshot as an image message too, if provided
    IF v_has_path THEN
      INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind, attachment_path)
      VALUES (v_order.conversation_id, v_uid, '[dispute evidence]', 'user', trim(p_evidence_path));
    END IF;
  END IF;
END;
$function$;
