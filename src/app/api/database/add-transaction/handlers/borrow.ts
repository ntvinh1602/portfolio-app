import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { borrowSchema } from "@/lib/schemas/transactions"

export async function handleBorrow(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof borrowSchema>
) {
  const {
    transaction_date,
    lender,
    principal,
    interest_rate,
    asset: cash_asset_id,
  } = data

  const { error } = await supabase.rpc("add_borrow_transaction", {
    p_user_id: userId,
    p_lender_name: lender,
    p_principal_amount: principal,
    p_interest_rate: interest_rate,
    p_transaction_date: transaction_date,
    p_cash_asset_id: cash_asset_id,
    p_description: `Loan from ${lender} at ${interest_rate}% p.a`,
  })

  if (error) {
    console.error("Error calling add_borrow_transaction:", error)
    throw new Error(`Failed to execute borrow transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}