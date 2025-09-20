import { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { depositSchema } from "@/components/sidebar/transaction/schema"

export async function handleDeposit(
  supabase: SupabaseClient,
  data: z.infer<typeof depositSchema>
) {
  const { transaction_date, quantity, asset } = data

  const { data: assetData, error: assetError } = await supabase
    .from("assets")
    .select("ticker")
    .eq("id", asset)
    .single()

  if (assetError) {
    console.error("Error fetching asset ticker:", assetError)
    throw new Error(`Failed to fetch asset details: ${assetError.message}`)
  }

  const description = assetData.ticker === 'EPF'
    ? `${assetData.ticker} monthly contribution`
    : `${assetData.ticker} deposit`

  const { error, data: result } = await supabase.rpc(
    "add_deposit_transaction", {
      p_transaction_date: transaction_date,
      p_quantity: quantity,
      p_description: description,
      p_asset_id: asset,
    },
  )

  if (error) {
    console.error("Error calling add_deposit_transaction:", error)
    throw new Error(`Failed to execute deposit transaction: ${error.message}`)
  }

  if (result.error) {
    throw new Error(`Failed to execute deposit transaction: ${result.error}`)
  }

  return { response: { success: true, transaction_id: result.transaction_id }, status: 200 }
}