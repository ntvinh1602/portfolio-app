import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { expenseSchema } from "@/lib/schemas/transactions"

export async function handleExpense(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof expenseSchema>
) {
  const { transaction_date, account, quantity, description, asset } = data

  const { data: accountData, error: accountError } = await supabase
    .from("accounts")
    .select("name")
    .eq("id", account)
    .single()

  if (accountError) {
    console.error("Error fetching account name:", accountError)
    throw new Error(`Failed to fetch account details: ${accountError.message}`)
  }

  const finalDescription = description || `Expense from ${accountData.name}`

  const { error } = await supabase.rpc("handle_expense_transaction", {
    p_user_id: userId,
    p_transaction_date: transaction_date,
    p_account_id: account,
    p_quantity: quantity,
    p_description: finalDescription,
    p_asset_id: asset,
  })

  if (error) {
    console.error("Error calling handle_expense_transaction:", error)
    throw new Error(`Failed to execute expense transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}