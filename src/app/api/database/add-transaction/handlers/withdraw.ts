import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { withdrawSchema } from "@/lib/schemas/transactions"

export async function handleWithdraw(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof withdrawSchema>
) {
  const { transaction_date, quantity, description, asset } = data

  const { error, data: result } = await supabase.rpc(
    "handle_withdraw_transaction",
    {
      p_user_id: userId,
      p_transaction_date: transaction_date,
      p_quantity: quantity,
      p_description: description,
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