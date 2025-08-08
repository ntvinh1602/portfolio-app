import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { buySchema } from "@/lib/schemas/transactions"

export async function handleBuy(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof buySchema>
) {
  const {
    transaction_date,
    account,
    asset,
    cash_asset_id,
    quantity,
    price,
    description,
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

  const finalDescription =
    description || `Buy ${quantity} ${assetData.ticker} at ${price}`

  const { error } = await supabase.rpc("handle_buy_transaction", {
    p_user_id: userId,
    p_transaction_date: transaction_date,
    p_account_id: account,
    p_asset_id: asset,
    p_cash_asset_id: cash_asset_id,
    p_quantity: quantity,
    p_price: price,
    p_description: finalDescription,
  })

  if (error) {
    console.error("Error calling handle_buy_transaction:", error)
    throw new Error(`Failed to execute buy transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}