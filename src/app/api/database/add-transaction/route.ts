import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { txnSchema } from "@/components/sidebar/transaction/schema"
import {
  handleBorrow,
  handleBuy,
  handleDebtPayment,
  handleDeposit,
  handleExpense,
  handleIncome,
  handleDividend,
  handleSell,
  handleSplit,
  handleWithdraw,
} from "./handlers"

export async function POST(request: NextRequest) {

  // Initialize Supabase client
  const supabase = await createClient()

  const body = await request.json()
  const parseResult = txnSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error }, { status: 400 })
  }

  const transactionData = parseResult.data

  try {
    let result
    switch (transactionData.transaction_type) {
      case "deposit":
        result = await handleDeposit(supabase, transactionData)
        break
      case "withdraw":
        result = await handleWithdraw(supabase, transactionData)
        break
      case "buy":
        result = await handleBuy(supabase, transactionData)
        break
      case "sell":
        result = await handleSell(supabase, transactionData)
        break
      case "income":
        result = await handleIncome(supabase, transactionData)
        break
      case "dividend":
        result = await handleDividend(supabase, transactionData)
        break
      case "expense":
        result = await handleExpense(supabase, transactionData)
        break
      case "borrow":
        result = await handleBorrow(supabase, transactionData)
        break
      case "debt_payment":
        result = await handleDebtPayment(supabase, transactionData)
        break
      case "split":
        result = await handleSplit(supabase, transactionData)
        break
      default:
        return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 })
    }

    return NextResponse.json(result.response, { status: result.status })
  } catch (error) {
    console.error(`Unexpected error during ${transactionData.transaction_type}:`, error)
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred."
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}