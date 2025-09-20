import { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { expenseSchema } from "@/components/sidebar/transaction/schema"

export async function handleExpense(
  supabase: SupabaseClient,
  data: z.infer<typeof expenseSchema>
) {
  const { transaction_date, quantity, description, asset } = data

  const { error } = await supabase.rpc("add_expense_transaction", {
    p_transaction_date: transaction_date,
    p_quantity: quantity,
    p_description: description,
    p_asset_id: asset,
  })

  if (error) {
    console.error("Error calling add_expense_transaction:", error)
    throw new Error(`Failed to execute expense transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}