import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { splitSchema } from "@/lib/schemas/transactions"

export async function handleSplit(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof splitSchema>
) {
  const {
    transaction_date,
    asset: asset_id,
    split_quantity: quantity,
  } = data

  const { data: assetSecurity, error: assetSecurityError } = await supabase
    .from("assets")
    .select("security_id")
    .eq("id", asset_id)
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

  const { error } = await supabase.rpc("handle_split_transaction", {
    p_user_id: userId,
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