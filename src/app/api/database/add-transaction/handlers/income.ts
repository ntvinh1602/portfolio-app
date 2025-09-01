import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { incomeSchema } from "@/lib/schemas/transactions"

export async function handleIncome(
  supabase: ReturnType<typeof createClient>["supabase"],
  data: z.infer<typeof incomeSchema>,
) {
  const {
    transaction_date,
    transaction_type,
    quantity,
    description,
    asset
  } = data

  const { error } = await supabase.rpc("add_income_transaction", {
    p_transaction_date: transaction_date,
    p_quantity: quantity,
    p_description: description,
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