import {
  TrendingUp,
  TrendingDown,
  Download,
  Upload,
  HandCoins,
  Handshake,
  ArrowBigDownDash,
  ArrowBigUpDash,
  CreditCard,
  Banknote,
  PiggyBank,
} from "lucide-react"

export const category = [
  { value: "stock", label: "Stock", icon: Banknote },
  { value: "cashflow", label: "Cashflow",icon: PiggyBank },
  { value: "debt", label: "Debt", icon: CreditCard },
]

export const operation = [
  { value: "buy", label: "Buy", icon: ArrowBigDownDash },
  { value: "sell", label: "Sell", icon: ArrowBigUpDash },
  { value: "deposit", label: "Deposit", icon: Download },
  { value: "withdraw", label: "Withdraw", icon: Upload },
  { value: "income", label: "Income", icon: TrendingUp },
  { value: "expense", label: "Expense", icon: TrendingDown },
  { value: "borrow", label: "Borrow", icon: HandCoins },
  { value: "repay", label: "Repay", icon: Handshake },
]