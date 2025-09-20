import { z } from "zod"
import { Database } from "@/types/database.types"

type AssetClass = Database["public"]["Enums"]["asset_class"]

export const assetSchema = z.object({
  ticker: z.string(),
  asset_class: z.custom<AssetClass>(),
  name: z.string(),
  currency_code: z.string()
    .length(3, "Currency must be a 3-letter ISO code")
    .toUpperCase(),
  logo_url: z
    .string()
    .url("Logo must be a valid URL"),
  is_active: z.boolean().default(true),
})
