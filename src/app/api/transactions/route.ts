import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"

const depositSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("deposit"),
  account: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional(),
})

const withdrawSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("withdraw"),
  account: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional(),
})

const buySchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("buy"),
  account: z.string().uuid(),
  asset: z.string().uuid(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  fees: z.number().nonnegative().optional().default(0),
  description: z.string().optional(),
})

const sellSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("sell"),
  account: z.string().uuid(),
  asset: z.string().uuid(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  fees: z.number().nonnegative().optional().default(0),
  description: z.string().optional(),
})

const incomeSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("income"),
  account: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional(),
})

const expenseSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("expense"),
  account: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional(),
})

const dividendSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("dividend"),
  account: z.string().uuid(),
  amount: z.number().positive(),
  "dividend-asset": z.string().uuid(),
  description: z.string().optional(),
})

const borrowSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("borrow"),
  lender: z.string(),
  principal: z.number().positive(),
  "interest-rate": z.number().nonnegative(),
  "deposit-account": z.string().uuid(),
  description: z.string().optional(),
})

const debtPaymentSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("debt_payment"),
  debt: z.string().uuid(),
  "from-account": z.string().uuid(),
  "principal-payment": z.number().positive(),
  "interest-payment": z.number().nonnegative(),
  description: z.string().optional(),
})

const splitSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("split"),
  asset: z.string().uuid(),
  "split-quantity": z.number().positive(),
})

const transactionSchema = z.discriminatedUnion("transaction_type", [
  depositSchema,
  withdrawSchema,
  buySchema,
  sellSchema,
  incomeSchema,
  expenseSchema,
  dividendSchema,
  borrowSchema,
  debtPaymentSchema,
  splitSchema,
])


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
        result = await handleIncome(supabase, user.id, transactionData)
        break
      case "expense":
        result = await handleExpense(supabase, user.id, transactionData)
        break
      case "dividend":
        result = await handleDividend(supabase, user.id, transactionData)
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
    return NextResponse.json(result.response, { status: result.status })
  } catch (error) {
    console.error(`Unexpected error during ${transactionData.transaction_type}:`, error)
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred."
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

async function handleDeposit(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof depositSchema>
) {
  const { transaction_date, account, amount, description } = data

  const { error, data: result } = await supabase.rpc("handle_deposit_transaction", {
    p_user_id: userId,
    p_transaction_date: transaction_date,
    p_account_id: account,
    p_amount: amount,
    p_description: description,
  })

  if (error) {
    console.error("Error calling handle_deposit_transaction:", error)
    throw new Error(`Failed to execute deposit transaction: ${error.message}`)
  }

  if (result.error) {
    throw new Error(`Failed to execute deposit transaction: ${result.error}`)
  }

  return { response: { success: true, transaction_id: result.transaction_id }, status: 200 }
}

async function handleWithdraw(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof withdrawSchema>
) {
  const { transaction_date, account, amount, description } = data

  const { error, data: result } = await supabase.rpc("handle_withdraw_transaction", {
    p_user_id: userId,
    p_transaction_date: transaction_date,
    p_account_id: account,
    p_amount: amount,
    p_description: description,
  })

  if (error) {
    console.error("Error calling handle_withdraw_transaction:", error)
    throw new Error(`Failed to execute withdraw transaction: ${error.message}`)
  }

  if (result.error) {
    throw new Error(`Failed to execute withdraw transaction: ${result.error}`)
  }

  return { response: { success: true, transaction_id: result.transaction_id }, status: 200 }
}

async function handleBuy(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof buySchema>
) {
  const { transaction_date, account, asset, quantity, price, fees, description } = data

  const { error } = await supabase.rpc("handle_buy_transaction", {
    p_user_id: userId,
    p_transaction_date: transaction_date,
    p_account_id: account,
    p_asset_id: asset,
    p_quantity: quantity,
    p_price: price,
    p_fees: fees,
    p_description: description || "Asset purchase",
  })

  if (error) {
    console.error("Error calling handle_buy_transaction:", error)
    throw new Error(`Failed to execute buy transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}

async function handleIncome(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof incomeSchema>
) {
  const { transaction_date, account, amount, description } = data

  const { error } = await supabase.rpc("handle_income_expense_transaction", {
    p_user_id: userId,
    p_transaction_date: transaction_date,
    p_account_id: account,
    p_amount: amount,
    p_description: description || "Income",
    p_transaction_type: "income",
  })

  if (error) {
    console.error("Error calling handle_income_expense_transaction (income):", error)
    throw new Error(`Failed to execute income transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}

async function handleExpense(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof expenseSchema>
) {
  const { transaction_date, account, amount, description } = data

  const { error } = await supabase.rpc("handle_income_expense_transaction", {
    p_user_id: userId,
    p_transaction_date: transaction_date,
    p_account_id: account,
    p_amount: amount,
    p_description: description || "Expense",
    p_transaction_type: "expense",
  })

  if (error) {
    console.error("Error calling handle_income_expense_transaction (expense):", error)
    throw new Error(`Failed to execute expense transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}

async function handleDividend(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof dividendSchema>
) {
  const {
    transaction_date,
    account: account_id,
    amount,
    "dividend-asset": asset_id,
  } = data

  const { error } = await supabase.rpc("handle_dividend_transaction", {
    p_user_id: userId,
    p_account_id: account_id,
    p_amount: amount,
    p_transaction_date: transaction_date,
    p_asset_id: asset_id,
  })

  if (error) {
    console.error("Error calling handle_dividend_transaction:", error)
    throw new Error(`Failed to execute dividend transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}

async function handleBorrow(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof borrowSchema>
) {
  const {
    transaction_date,
    lender,
    principal,
    "interest-rate": interest_rate,
    "deposit-account": deposit_account_id,
  } = data

  const { error } = await supabase.rpc("handle_borrow_transaction", {
    p_user_id: userId,
    p_lender_name: lender,
    p_principal_amount: principal,
    p_interest_rate: interest_rate,
    p_transaction_date: transaction_date,
    p_deposit_account_id: deposit_account_id,
  })

  if (error) {
    console.error("Error calling handle_borrow_transaction:", error)
    throw new Error(`Failed to execute borrow transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}

async function handleDebtPayment(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof debtPaymentSchema>
) {
  const {
    transaction_date,
    debt: debt_id,
    "from-account": from_account_id,
    "principal-payment": principal_payment,
    "interest-payment": interest_payment,
  } = data

  const { error } = await supabase.rpc("handle_debt_payment_transaction", {
    p_debt_id: debt_id,
    p_principal_payment: principal_payment,
    p_interest_payment: interest_payment,
    p_transaction_date: transaction_date,
    p_from_account_id: from_account_id,
  })

  if (error) {
    console.error("Error calling handle_debt_payment_transaction:", error)
    throw new Error(`Failed to execute debt payment transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}

async function handleSplit(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof splitSchema>
) {
  const {
    transaction_date,
    asset: asset_id,
    "split-quantity": quantity,
  } = data

  const { error } = await supabase.rpc("handle_split_transaction", {
    p_asset_id: asset_id,
    p_quantity: quantity,
    p_transaction_date: transaction_date,
  })

  if (error) {
    console.error("Error calling handle_split_transaction:", error)
    throw new Error(`Failed to execute split transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}

async function handleSell(
  supabase: ReturnType<typeof createClient>["supabase"],
  userId: string,
  data: z.infer<typeof sellSchema>
) {
  const { transaction_date, account, asset, quantity, price, fees, description } = data

  const total_proceeds = quantity * price

  const { error } = await supabase.rpc("handle_sell_transaction", {
    p_user_id: userId,
    p_asset_id: asset,
    p_quantity_to_sell: quantity,
    p_total_proceeds: total_proceeds,
    p_fees: fees,
    p_transaction_date: transaction_date,
    p_cash_account_id: account,
    p_description: description || "Asset sale",
  })

  if (error) {
    console.error("Error calling handle_sell_transaction:", error)
    throw new Error(`Failed to execute sell transaction: ${error.message}`)
  }

  return { response: { success: true }, status: 200 }
}