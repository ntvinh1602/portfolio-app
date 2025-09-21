import { z } from "zod"
import { assetSchema } from "@/app/assets/components/form/schema"

// Infer the TypeScript type from the schema
export type AssetPayload = z.infer<typeof assetSchema>

/**
 * Prepare payload from raw form values.
 * This handles type coercion (string → boolean, uppercase codes, etc.)
 */
export function preparePayload(formState: Record<string, string | boolean | undefined>) {
  const prepared = {
    ticker: String(formState.ticker ?? "").trim().toUpperCase(),
    asset_class: formState.asset_class,
    name: String(formState.name ?? "").trim(),
    currency_code: String(formState.currency_code ?? "").trim().toUpperCase(),
    logo_url: String(formState.logo_url ?? "").trim(),
    is_active: formState.is_active === "true",
  }

  return prepared
}
