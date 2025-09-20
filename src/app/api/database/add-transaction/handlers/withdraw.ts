import { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { withdrawSchema } from "@/components/sidebar/transaction/schema"

export async function handleWithdraw(
  supabase: SupabaseClient,
  data: z.infer<typeof withdrawSchema>
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

  const { error, data: result } = await supabase.rpc(
    "add_withdraw_transaction", {
      p_transaction_date: transaction_date,
      p_quantity: quantity,
      p_description: `${assetData.ticker} withdrawal`,
      p_asset_id: asset,
    },
  )

  if (error) {
    console.error("Error calling handle_withdraw_transaction:", error)
    throw new Error(`Failed to execute withdraw transaction: ${error.message}`)
  }

  if (result.error) {
    throw new Error(`Failed to execute withdraw transaction: ${result.error}`)
  }

  return { response: { success: true, transaction_id: result.transaction_id }, status: 200 }
}