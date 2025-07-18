import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/middleware"
import { z } from "zod"

// Base schema for common fields
const baseSchema = z.object({
  transaction_date: z.string().date(),
  description: z.string().optional(),
})

// Schema definitions
const schemas = {
  deposit: baseSchema.extend({
    transaction_type: z.literal("deposit"),
    account: z.string().uuid(),
    quantity: z.number().positive(),
    asset: z.string().uuid(),
  }),
  
  withdraw: baseSchema.extend({
    transaction_type: z.literal("withdraw"),
    account: z.string().uuid(),
    quantity: z.number().positive(),
    asset: z.string().uuid(),
  }),
  
  buy: baseSchema.extend({
    transaction_type: z.literal("buy"),
    account: z.string().uuid(),
    asset: z.string().uuid(),
    cash_asset_id: z.string().uuid(),
    quantity: z.number().positive(),
    price: z.number().nonnegative(),
    fees: z.number().nonnegative().optional().default(0),
  }),
  
  sell: baseSchema.extend({
    transaction_type: z.literal("sell"),
    account: z.string().uuid(),
    asset: z.string().uuid(),
    cash_asset_id: z.string().uuid(),
    quantity: z.number().positive(),
    price: z.number().nonnegative(),
    fees: z.number().nonnegative().optional().default(0),
    taxes: z.number().nonnegative().optional().default(0),
  }),
  
  income: baseSchema.extend({
    transaction_type: z.literal("income"),
    account: z.string().uuid(),
    quantity: z.number().positive(),
    asset: z.string().uuid(),
  }),
  
  expense: baseSchema.extend({
    transaction_type: z.literal("expense"),
    account: z.string().uuid(),
    quantity: z.number().positive(),
    asset: z.string().uuid(),
  }),
  
  dividend: baseSchema.extend({
    transaction_type: z.literal("dividend"),
    account: z.string().uuid(),
    quantity: z.number().positive(),
    dividend_asset: z.string().uuid(),
    asset: z.string().uuid(),
  }),
  
  borrow: baseSchema.extend({
    transaction_type: z.literal("borrow"),
    lender: z.string(),
    principal: z.number().positive(),
    interest_rate: z.number().nonnegative(),
    deposit_account_id: z.string().uuid(),
    asset: z.string().uuid(),
  }),
  
  debt_payment: baseSchema.extend({
    transaction_type: z.literal("debt_payment"),
    debt: z.string().uuid(),
    from_account_id: z.string().uuid(),
    principal_payment: z.number().positive(),
    interest_payment: z.number().nonnegative(),
    asset: z.string().uuid(),
  }),
  
  split: baseSchema.extend({
    transaction_type: z.literal("split"),
    asset: z.string().uuid(),
    split_quantity: z.number().positive(),
  }),
}

const transactionSchema = z.discriminatedUnion("transaction_type", [
  schemas.deposit,
  schemas.withdraw,
  schemas.buy,
  schemas.sell,
  schemas.income,
  schemas.expense,
  schemas.dividend,
  schemas.borrow,
  schemas.debt_payment,
  schemas.split,
])

// Helper functions
const fetchData = async (supabase: any, table: string, id: string, select = "*") => {
  const { data, error } = await supabase.from(table).select(select).eq("id", id).single()
  if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`)
  return data
}

const fetchAssetTicker = async (supabase: any, assetId: string) => {
  const asset = await fetchData(supabase, "assets", assetId, "security_id")
  const security = await fetchData(supabase, "securities", asset.security_id, "ticker")
  return security.ticker
}

const callRpc = async (supabase: any, funcName: string, params: any) => {
  const { data, error } = await supabase.rpc(funcName, params)
  if (error) throw new Error(`RPC ${funcName} failed: ${error.message}`)
  if (data?.error) throw new Error(`RPC ${funcName} failed: ${data.error}`)
  return data
}

// Transaction handlers
const handlers = {
  deposit: async (supabase: any, userId: string, data: any) => {
    const account = await fetchData(supabase, "accounts", data.account, "name")
    const description = data.description || `Deposit to ${account.name}`
    
    const result = await callRpc(supabase, "handle_deposit_transaction", {
      p_user_id: userId,
      p_transaction_date: data.transaction_date,
      p_account_id: data.account,
      p_quantity: data.quantity,
      p_description: description,
      p_asset_id: data.asset,
    })
    
    return { success: true, transaction_id: result.transaction_id }
  },

  withdraw: async (supabase: any, userId: string, data: any) => {
    const account = await fetchData(supabase, "accounts", data.account, "name")
    const description = data.description || `Withdrawal from ${account.name}`
    
    await callRpc(supabase, "handle_withdraw_transaction", {
      p_user_id: userId,
      p_transaction_date: data.transaction_date,
      p_account_id: data.account,
      p_quantity: data.quantity,
      p_description: description,
      p_asset_id: data.asset,
    })
    
    return { success: true }
  },

  buy: async (supabase: any, userId: string, data: any) => {
    const ticker = await fetchAssetTicker(supabase, data.asset)
    const description = data.description || `Buy ${data.quantity} ${ticker} at ${data.price}`
    
    await callRpc(supabase, "handle_buy_transaction", {
      p_user_id: userId,
      p_transaction_date: data.transaction_date,
      p_account_id: data.account,
      p_asset_id: data.asset,
      p_cash_asset_id: data.cash_asset_id,
      p_quantity: data.quantity,
      p_price: data.price,
      p_fees: data.fees,
      p_description: description,
    })
    
    return { success: true }
  },

  sell: async (supabase: any, userId: string, data: any) => {
    const ticker = await fetchAssetTicker(supabase, data.asset)
    const description = data.description || `Sell ${data.quantity} ${ticker} at ${data.price}`
    
    await callRpc(supabase, "handle_sell_transaction", {
      p_user_id: userId,
      p_asset_id: data.asset,
      p_quantity_to_sell: data.quantity,
      p_price: data.price,
      p_fees: data.fees,
      p_taxes: data.taxes,
      p_transaction_date: data.transaction_date,
      p_cash_account_id: data.account,
      p_cash_asset_id: data.cash_asset_id,
      p_description: description,
    })
    
    return { success: true }
  },

  income: async (supabase: any, userId: string, data: any) => {
    const account = await fetchData(supabase, "accounts", data.account, "name")
    const description = data.description || `Income to ${account.name}`

    await callRpc(supabase, "handle_income_transaction", {
      p_user_id: userId,
      p_transaction_date: data.transaction_date,
      p_account_id: data.account,
      p_quantity: data.quantity,
      p_description: description,
      p_asset_id: data.asset,
    })

    return { success: true }
  },

  dividend: async (supabase: any, userId: string, data: any) => {
    const account = await fetchData(supabase, "accounts", data.account, "name")
    const ticker = await fetchAssetTicker(supabase, data.dividend_asset)
    const description =
      data.description || `Dividend from ${ticker} to ${account.name}`

    await callRpc(supabase, "handle_dividend_transaction", {
      p_user_id: userId,
      p_transaction_date: data.transaction_date,
      p_account_id: data.account,
      p_quantity: data.quantity,
      p_description: description,
      p_asset_id: data.asset,
      p_dividend_asset_id: data.dividend_asset,
    })

    return { success: true }
  },

  expense: async (supabase: any, userId: string, data: any) => {
    const account = await fetchData(supabase, "accounts", data.account, "name")
    const description = data.description || `Expense from ${account.name}`
    
    await callRpc(supabase, "handle_expense_transaction", {
      p_user_id: userId,
      p_transaction_date: data.transaction_date,
      p_account_id: data.account,
      p_quantity: data.quantity,
      p_description: description,
      p_asset_id: data.asset,
    })
    
    return { success: true }
  },

  borrow: async (supabase: any, userId: string, data: any) => {
    const description = data.description || `Loan from ${data.lender} at ${data.interest_rate}% p.a`
    
    await callRpc(supabase, "handle_borrow_transaction", {
      p_user_id: userId,
      p_lender_name: data.lender,
      p_principal_amount: data.principal,
      p_interest_rate: data.interest_rate,
      p_transaction_date: data.transaction_date,
      p_deposit_account_id: data.deposit_account_id,
      p_cash_asset_id: data.asset,
      p_description: description,
    })
    
    return { success: true }
  },

  debt_payment: async (supabase: any, userId: string, data: any) => {
    const debt = await fetchData(supabase, "debts", data.debt, "lender_name")
    const account = await fetchData(supabase, "accounts", data.from_account_id, "name")
    const description = data.description || `Debt payment to ${debt.lender_name} from ${account.name}`
    
    await callRpc(supabase, "handle_debt_payment_transaction", {
      p_user_id: userId,
      p_debt_id: data.debt,
      p_principal_payment: data.principal_payment,
      p_interest_payment: data.interest_payment,
      p_transaction_date: data.transaction_date,
      p_from_account_id: data.from_account_id,
      p_cash_asset_id: data.asset,
      p_description: description,
    })
    
    return { success: true }
  },

  split: async (supabase: any, userId: string, data: any) => {
    const ticker = await fetchAssetTicker(supabase, data.asset)
    const description = `Stock split for ${ticker}`
    
    await callRpc(supabase, "handle_split_transaction", {
      p_user_id: userId,
      p_asset_id: data.asset,
      p_quantity: data.split_quantity,
      p_transaction_date: data.transaction_date,
      p_description: description,
    })
    
    return { success: true }
  },
}


export async function POST(request: NextRequest) {
  const { supabase } = createClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parseResult = transactionSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error }, { status: 400 })
  }

  const { transaction_type } = parseResult.data
  const handler = handlers[transaction_type]

  if (!handler) {
    return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 })
  }

  try {
    const result = await handler(supabase, user.id, parseResult.data)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error(`Error during ${transaction_type}:`, error)
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred."
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}