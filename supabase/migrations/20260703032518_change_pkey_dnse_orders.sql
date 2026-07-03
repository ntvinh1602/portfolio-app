
ALTER TABLE public.dnse_order_events DROP CONSTRAINT dnse_order_events_pkey;

ALTER TABLE public.dnse_order_events ADD CONSTRAINT dnse_order_events_pkey PRIMARY KEY (received_at);