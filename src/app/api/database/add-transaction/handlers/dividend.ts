import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { dividendSchema } from "@/lib/schemas/transactions"

export async function handleDividend(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof dividendSchema>,
) {
  const {
    transaction_date,
    transaction_type,
    quantity,
    dividend_asset,
    asset
  } = data

  const { data: assetSecurity, error: assetSecurityError } =
    await supabase
      .from("assets")
      .select("security_id")
      .eq("id", dividend_asset)
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

  const { error } = await supabase.rpc("add_income_transaction", {
    p_user_id: userId,
    p_transaction_date: transaction_date,
    p_quantity: quantity,
    p_description: `Dividend from ${assetData.ticker}`,
    p_asset_id: asset,
    p_transaction_type: transaction_type,
  })

  if (error) {
    console.error(
      `Error calling add_income_transaction:`, error)
    throw new Error(
      `Failed to execute ${transaction_type} transaction: ${error.message}`,
    )
  }

  return { response: { success: true }, status: 200 }
}