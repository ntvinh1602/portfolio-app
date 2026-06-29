ALTER TABLE public.asset_positions
DROP CONSTRAINT IF EXISTS asset_positions_pkey;

CREATE UNIQUE INDEX asset_positions_pkey
ON public.asset_positions (user_id, asset_id);

ALTER TABLE public.asset_positions
ADD CONSTRAINT asset_positions_pkey
PRIMARY KEY USING INDEX asset_positions_pkey;