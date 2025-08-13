import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { expenseSchema } from "@/lib/schemas/transactions"

export async function handleExpense(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof expenseSchema>
) {
  const { transaction_date, quantity, description, asset } = data

  const { error } = await supabase.rpc("handle_expense_transaction", {
    p_user_id: userId,
    p_transaction_date: transaction_date,
    p_quantity: quantity,
    p_description: description,
    p_asset_id: asset,
  })

  if (error) {
    console.error("Error calling handle_expense_transaction:", error)
    throw new Error(`Failed to execute expense transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}