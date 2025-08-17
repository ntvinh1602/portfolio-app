import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { debtPaymentSchema } from "@/lib/schemas/transactions"

export async function handleDebtPayment(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof debtPaymentSchema>
) {
  const {
    transaction_date,
    debt: debt_id,
    principal_payment,
    interest_payment,
    asset: cash_asset_id,
  } = data

  const { data: debtData, error: debtError } = await supabase
    .from("debts")
    .select("lender_name")
    .eq("id", debt_id)
    .single()

  if (debtError) {
    console.error("Error fetching debt details:", debtError)
    throw new Error(`Failed to fetch debt details: ${debtError.message}`)
  }

  const { error } = await supabase.rpc("add_debt_payment_transaction", {
    p_user_id: userId,
    p_debt_id: debt_id,
    p_principal_payment: principal_payment,
    p_interest_payment: interest_payment,
    p_transaction_date: transaction_date,
    p_cash_asset_id: cash_asset_id,
    p_description: `Debt payment to ${debtData.lender_name}`,
  })

  if (error) {
    console.error("Error calling add_debt_payment_transaction:", error)
    throw new Error(`Failed to execute debt payment transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}