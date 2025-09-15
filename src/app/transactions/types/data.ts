type TxnLeg = {
  id: string
  amount: number
  quantity: number
  assets: {
    asset_class: string
    name: string
    ticker: string
    logo_url: string | null
  }
}

type Expense = {
  description: string
  transaction_legs: { amount: number }[]
}

export type {
  TxnLeg,
  Expense
}