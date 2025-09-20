import { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { buySchema } from "@/lib/schemas/transaction"

export async function handleBuy(
  supabase: SupabaseClient,
  data: z.infer<typeof buySchema>
) {
  const {
    transaction_date,
    asset,
    cash_asset_id,
    quantity,
    price
  } = data

  const { data: assetData, error: assetError } = await supabase
    .from("assets")
    .select("ticker")
    .eq("id", asset)
    .single()

  if (assetError) {
    console.error("Error fetching asset ticker:", assetError)
    throw new Error(`Failed to fetch asset details: ${assetError.message}`)
  }

  const { error } = await supabase.rpc("add_buy_transaction", {
    p_transaction_date: transaction_date,
    p_asset_id: asset,
    p_cash_asset_id: cash_asset_id,
    p_quantity: quantity,
    p_price: price,
    p_description: `Buy ${quantity} ${assetData.ticker} at ${price}`,
  })

  if (error) {
    console.error("Error calling add_buy_transaction:", error)
    throw new Error(`Failed to execute buy transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}