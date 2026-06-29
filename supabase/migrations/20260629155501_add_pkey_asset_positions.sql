CREATE UNIQUE INDEX asset_positions_pkey ON public.asset_positions USING btree (asset_id);

alter table "public"."asset_positions" add constraint "asset_positions_pkey" PRIMARY KEY using index "asset_positions_pkey";


