import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { depositSchema } from "@/lib/schemas/transactions"

export async function handleDeposit(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof depositSchema>
) {
  const { transaction_date, quantity, description, asset } = data

  const { error, data: result } = await supabase.rpc(
    "add_deposit_transaction",
    {
      p_user_id: userId,
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