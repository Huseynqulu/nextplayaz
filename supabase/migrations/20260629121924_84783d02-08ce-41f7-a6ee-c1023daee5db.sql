ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'refunded';