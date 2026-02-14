import * as z from "zod"

export const stockSchema = z.object({
  side: z.enum(["buy", "sell"]),
  ticker: z.string().min(3),
  price: z.number().min(0, "Price must be positive"),
  quantity: z.number().positive("Quantity must be positive"),
  fee: z.number().min(0, "Fee cannot be negative"),
  tax: z.number().min(0, "Tax cannot be negative").optional()
})

export const cashflowSchema = z.object({
  operation: z.enum(["deposit", "withdraw", "income", "expense"]),
  asset: z.string().uuid(),
  quantity: z.number().positive("Quantity must be positive"),
  fx_rate: z.number().min(1, "FX Rate cant be less than 1").optional(),
  memo: z.string()
})