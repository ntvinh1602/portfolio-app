import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/middleware"
import { transactionSchema } from "@/lib/schemas/transactions"
import {
  handleBorrow,
  handleBuy,
  handleDebtPayment,
  handleDeposit,
  handleExpense,
  handleIncome,
  handleSell,
  handleSplit,
  handleWithdraw,
} from "./handlers"
import { revalidateTag } from "next/cache"

export async function POST(request: NextRequest) {
  const { supabase } = createClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parseResult = transactionSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error }, { status: 400 })
  }

  const transactionData = parseResult.data

  try {
    let result
    switch (transactionData.transaction_type) {
      case "deposit":
        result = await handleDeposit(supabase, user.id, transactionData)
        break
      case "withdraw":
        result = await handleWithdraw(supabase, user.id, transactionData)
        break
      case "buy":
        result = await handleBuy(supabase, user.id, transactionData)
        break
      case "sell":
        result = await handleSell(supabase, user.id, transactionData)
        break
      case "income":
      case "dividend":
        result = await handleIncome(supabase, user.id, transactionData)
        break
      case "expense":
        result = await handleExpense(supabase, user.id, transactionData)
        break
      case "borrow":
        result = await handleBorrow(supabase, user.id, transactionData)
        break
      case "debt_payment":
        result = await handleDebtPayment(supabase, user.id, transactionData)
        break
      case "split":
        result = await handleSplit(supabase, user.id, transactionData)
        break
      default:
        return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 })
    }

    if (result.status >= 200 && result.status < 300) {
      revalidateTag(`txn-driven-${user.id}`)
      revalidateTag(`price-driven-${user.id}`)
    }

    return NextResponse.json(result.response, { status: result.status })
  } catch (error) {
    console.error(`Unexpected error during ${transactionData.transaction_type}:`, error)
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred."
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}