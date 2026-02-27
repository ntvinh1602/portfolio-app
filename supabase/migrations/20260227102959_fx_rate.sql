ALTER TABLE daily_exchange_rates RENAME TO historical_fxrate;
CREATE INDEX ON public.historical_prices USING btree (date);
