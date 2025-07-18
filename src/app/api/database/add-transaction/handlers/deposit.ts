import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"
import { depositSchema } from "@/lib/schemas/transactions"

export async function handleDeposit(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof depositSchema>
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

  const finalDescription = description || `Deposit to ${accountData.name}`

  const { error, data: result } = await supabase.rpc(
    "handle_deposit_transaction",
    {
      p_user_id: userId,
      p_transaction_date: transaction_date,
      p_account_id: account,
      p_quantity: quantity,
      p_description: finalDescription,
      p_asset_id: asset,
    },
  )

  if (error) {
    console.error("Error calling handle_deposit_transaction:", error)
    throw new Error(`Failed to execute deposit transaction: ${error.message}`)
  }

  if (result.error) {
    throw new Error(`Failed to execute deposit transaction: ${result.error}`)
  }

  return { response: { success: true, transaction_id: result.transaction_id }, status: 200 }
}