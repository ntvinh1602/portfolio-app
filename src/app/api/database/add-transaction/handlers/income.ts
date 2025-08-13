import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { incomeSchema, dividendSchema } from "@/lib/schemas/transactions"

export async function handleIncome(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof incomeSchema> | z.infer<typeof dividendSchema>,
) {
  const {
    transaction_date,
    description,
    asset,
    transaction_type,
  } = data

  let finalDescription = description
  if (!finalDescription) {
    if (transaction_type === "dividend") {
      const dividendData = data as z.infer<typeof dividendSchema>
      const { data: assetSecurity, error: assetSecurityError } =
        await supabase
          .from("assets")
          .select("security_id")
          .eq("id", dividendData.dividend_asset)
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
      finalDescription = `Dividend from ${assetData.ticker}`
    } else {
      finalDescription = description
    }
  }

  const quantity = "quantity" in data ? data.quantity : 0

  const { error } = await supabase.rpc("add_income_transaction", {
    p_user_id: userId,
    p_transaction_date: transaction_date,
    p_quantity: quantity,
    p_description: finalDescription,
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