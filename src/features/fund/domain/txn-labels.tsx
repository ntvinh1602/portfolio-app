import type { LucideIcon } from "lucide-react"
import {
  TrendingUp,
  TrendingDown,
  Download,
  Upload,
  HandCoins,
  Handshake,
  ArrowBigDownDash,
  ArrowBigUpDash,
  Banknote,
  Box,
} from "lucide-react"

export interface LabelConfig {
  value: string
  label: string
  icon: LucideIcon
}

export const category: LabelConfig[] = [
  { value: "stock", label: "Stock", icon: Box },
  { value: "cashflow", label: "Cashflow", icon: Banknote },
  { value: "debt", label: "Debt", icon: HandCoins },
]

export const operation: LabelConfig[] = [
  { value: "buy", label: "Buy", icon: ArrowBigDownDash },
  { value: "sell", label: "Sell", icon: ArrowBigUpDash },
  { value: "deposit", label: "Deposit", icon: Download },
  { value: "withdraw", label: "Withdraw", icon: Upload },
  { value: "income", label: "Income", icon: TrendingUp },
  { value: "expense", label: "Expense", icon: TrendingDown },
  { value: "borrow", label: "Borrow", icon: HandCoins },
  { value: "repay", label: "Repay", icon: Handshake },
]
