
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_sold_at timestamptz;

-- Backfill from existing orders
UPDATE public.products p
SET last_sold_at = sub.last_at
FROM (
  SELECT product_id, MAX(created_at) AS last_at
  FROM public.orders
  WHERE product_id IS NOT NULL
  GROUP BY product_id
) sub
WHERE p.id = sub.product_id;

CREATE OR REPLACE FUNCTION public.touch_product_last_sold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products SET last_sold_at = NEW.created_at WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_product_last_sold ON public.orders;
CREATE TRIGGER trg_touch_product_last_sold
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_product_last_sold();
