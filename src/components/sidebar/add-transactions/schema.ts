import * as z from "zod"

export const stockSchema = z.object({
  side: z.enum(["buy", "sell"]),
  ticker: z.string(),
  price: z.coerce.number()
    .int("Price must be a whole number")
    .min(0, "Price cannot be negative"),
  quantity: z.coerce.number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be positive"),
  fee: z.coerce.number()
    .int("Fee must be a whole number")
    .min(0, "Fee cannot be negative"),
  tax: z.coerce.number()
    .int("Tax must be a whole number")
    .min(0, "Tax cannot be negative").optional()
})

export const cashflowSchema = z.object({
  operation: z.enum(["deposit", "withdraw", "income", "expense"]),
  asset: z.string().uuid(),
  quantity: z.coerce.number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be positive"),
  fx_rate: z.coerce.number().min(1, "FX Rate cant be less than 1").optional(),
  memo: z.string()
})

export const borrowSchema = z.object({
  principal: z.coerce.number()
    .int("Principal must be a whole number")
    .positive("Quantity must be positive"),
  lender: z.string(),
  rate: z.coerce.number().min(0, "Interest rate cannot be negative")
})

export const repaySchema = z.object({
  repay_tx: z.string().uuid(),
  interest: z.coerce.number()
    .int("Interest must be a whole number")
    .min(0, "Interest cannot be negative"),
})