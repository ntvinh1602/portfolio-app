import { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { repaySchema } from "@/components/sidebar/add-transaction/schema"

export async function handleRepay(
  supabase: SupabaseClient,
  data: z.infer<typeof repaySchema>
) {
  const {
    transaction_date,
    debt: debt_id,
    principal_payment,
    interest_payment,
    cash_asset_id,
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

  const { error } = await supabase.rpc("add_repay_transaction", {
    p_debt_id: debt_id,
    p_paid_principal: principal_payment,
    p_paid_interest: interest_payment,
    p_txn_date: transaction_date,
    p_cash_asset_id: cash_asset_id,
    p_description: `Debt payment to ${debtData.lender_name}`,
  })

  if (error) {
    console.error("Error calling add_repay_transaction:", error)
    throw new Error(`Failed to execute debt payment transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}