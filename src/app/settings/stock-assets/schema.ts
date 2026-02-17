import * as z from "zod"

export const addSchema = z.object({
  asset_class: z.string().min(1, "Asset Class is required!"),
  ticker: z.string()
    .min(1, "Ticker is required!")
    .transform((val) => val.toUpperCase()),
  name: z.string().min(1, "Name is required!"),
  currency_code: z.string().min(1, "Currency is required!"),
  logo_url: z.string().url("Logo URL must be a valid URL")
})

export const editSchema = z.object({
  id: z.string().uuid(),
  asset_class: z.string().min(1, "Asset Class is required!"),
  ticker: z.string()
    .min(1, "Ticker is required!")
    .transform((val) => val.toUpperCase()),
  name: z.string().min(1, "Name is required!"),
  currency_code: z.string().min(1, "Currency is required!"),
  logo_url: z.string().url("Logo URL must be a valid URL")
})

