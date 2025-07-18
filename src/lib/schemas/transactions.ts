import { z } from "zod"

export const depositSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("deposit"),
  account: z.string().uuid(),
  quantity: z.number().positive(),
  description: z.string().optional(),
  asset: z.string().uuid(),
})

export const withdrawSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("withdraw"),
  account: z.string().uuid(),
  quantity: z.number().positive(),
  description: z.string().optional(),
  asset: z.string().uuid(),
})

export const buySchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("buy"),
  account: z.string().uuid(),
  asset: z.string().uuid(),
  cash_asset_id: z.string().uuid(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  fees: z.number().nonnegative().optional().default(0),
  description: z.string().optional(),
})

export const sellSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("sell"),
  account: z.string().uuid(),
  asset: z.string().uuid(),
  cash_asset_id: z.string().uuid(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  fees: z.number().nonnegative().optional().default(0),
  taxes: z.number().nonnegative().optional().default(0),
  description: z.string().optional(),
})

export const incomeSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("income"),
  account: z.string().uuid(),
  quantity: z.number().positive(),
  description: z.string().optional(),
  asset: z.string().uuid(),
})

export const expenseSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("expense"),
  account: z.string().uuid(),
  quantity: z.number().positive(),
  description: z.string().optional(),
  asset: z.string().uuid(),
})

export const dividendSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("dividend"),
  account: z.string().uuid(),
  quantity: z.number().positive(),
  dividend_asset: z.string().uuid(),
  description: z.string().optional(),
  asset: z.string().uuid(), // This is the cash asset
})

export const borrowSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("borrow"),
  lender: z.string(),
  principal: z.number().positive(),
  interest_rate: z.number().nonnegative(),
  deposit_account_id: z.string().uuid(),
  description: z.string().optional(),
  asset: z.string().uuid(),
})

export const debtPaymentSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("debt_payment"),
  debt: z.string().uuid(),
  from_account_id: z.string().uuid(),
  principal_payment: z.number().positive(),
  interest_payment: z.number().nonnegative(),
  description: z.string().optional(),
  asset: z.string().uuid(),
})

export const splitSchema = z.object({
  transaction_date: z.string().date(),
  transaction_type: z.literal("split"),
  asset: z.string().uuid(),
  split_quantity: z.number().positive(),
})

export const transactionSchema = z.discriminatedUnion("transaction_type", [
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