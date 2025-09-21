import { z } from "zod"
import { Constants } from "@/types/database.types"

export const assetSchema = z.object({
  id: z.string().uuid().optional(), 
  ticker: z.string().min(1, "Ticker is required"),
  asset_class: z.enum(Constants.public.Enums.asset_class, {
    errorMap: () => ({ message: "Asset class is required" }),
  }),
  name: z.string().min(1, "Name is required"),
  currency_code: z.string()
    .length(3, "Currency must be a 3-letter ISO code"),
  logo_url: z.string().url("Logo must be a valid URL"),
  is_active: z.boolean().default(true),
})
