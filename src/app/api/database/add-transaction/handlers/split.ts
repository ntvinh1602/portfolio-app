import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { splitSchema } from "@/lib/schemas/transactions"

export async function handleSplit(
  supabase: ReturnType<typeof createClient>["supabase"],
  data: z.infer<typeof splitSchema>
) {
  const {
    transaction_date,
    asset: asset_id,
    split_quantity: quantity,
  } = data

  const { data: assetData, error: assetError } = await supabase
    .from("assets")
    .select("ticker")
    .eq("id", asset_id)
    .single()

  if (assetError) {
    console.error("Error fetching asset ticker:", assetError)
    throw new Error(`Failed to fetch asset details: ${assetError.message}`)
  }

  const { error } = await supabase.rpc("add_split_transaction", {
    p_asset_id: asset_id,
    p_quantity: quantity,
    p_transaction_date: transaction_date,
    p_description: `Stock split for ${assetData.ticker}`,
  })

  if (error) {
    console.error("Error calling handle_split_transaction:", error)
    throw new Error(`Failed to execute split transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}