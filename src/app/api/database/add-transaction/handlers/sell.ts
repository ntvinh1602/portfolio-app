import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { sellSchema } from "@/lib/schemas/transactions"

export async function handleSell(
  supabase: ReturnType<typeof createClient>["supabase"],
  data: z.infer<typeof sellSchema>
) {
  const {
    transaction_date,
    asset,
    cash_asset_id,
    quantity,
    price,
  } = data

  const { data: assetSecurity, error: assetSecurityError } = await supabase
    .from("assets")
    .select("security_id")
    .eq("id", asset)
    .single()

  if (assetSecurityError) {
    console.error("Error fetching asset security id:", assetSecurityError)
    throw new Error(
      `Failed to fetch asset security details: ${assetSecurityError.message}`,
    )
  }

  const { data: assetData, error: assetError } = await supabase
    .from("securities")
    .select("ticker")
    .eq("id", assetSecurity.security_id)
    .single()

  if (assetError) {
    console.error("Error fetching asset ticker:", assetError)
    throw new Error(`Failed to fetch asset details: ${assetError.message}`)
  }

  const { error } = await supabase.rpc("add_sell_transaction", {
    p_asset_id: asset,
    p_quantity_to_sell: quantity,
    p_price: price,
    p_transaction_date: transaction_date,
    p_cash_asset_id: cash_asset_id,
    p_description: `Sell ${quantity} ${assetData.ticker} at ${price}`,
  })

  if (error) {
    console.error("Error calling add_sell_transaction:", error)
    throw new Error(`Failed to execute sell transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}