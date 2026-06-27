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
import { ChartConfig } from "@/components/ui/chart"
import { ChoiceCardCfg, LabelConfig } from "@/types/global.types"

/* --- LABEL CONFIG --- */
export const txCategory: LabelConfig[] = [
  { value: "stock", label: "Stock", icon: Box },
  { value: "cashflow", label: "Cashflow", icon: Banknote },
  { value: "debt", label: "Debt", icon: HandCoins },
]

export const txOps: LabelConfig[] = [
  { value: "buy", label: "Buy", icon: ArrowBigDownDash },
  { value: "sell", label: "Sell", icon: ArrowBigUpDash },
  { value: "deposit", label: "Deposit", icon: Download },
  { value: "withdraw", label: "Withdraw", icon: Upload },
  { value: "income", label: "Income", icon: TrendingUp },
  { value: "expense", label: "Expense", icon: TrendingDown },
  { value: "borrow", label: "Borrow", icon: HandCoins },
  { value: "repay", label: "Repay", icon: Handshake },
]

/* --- CHOICE CARD CONFIG --- */
export const cashflowOps: ChoiceCardCfg[] = [
  { value: "deposit", label: "Deposit", description: "For a bright future" },
  { value: "withdraw", label: "Withdraw", description: "Time for shopping" },
  { value: "income", label: "Income", description: "Payday!" },
  { value: "expense", label: "Expense", description: "So expensive!" },
]

export const stockOps: ChoiceCardCfg[] = [
  { value: "buy", label: "Buy", description: "Is it bottom yet?" },
  { value: "sell", label: "Sell", description: "Time to cash out!" },
]

/* --- CHART CONFIG --- */
export const assetChart: ChartConfig = {
  cash: { label: "Cash", color: "var(--chart-1)" },
  stock: { label: "Stock", color: "var(--chart-2)" },
  fund: { label: "Fund", color: "var(--chart-3)" },
}

export const liabilityChart: ChartConfig = {
  equity: { label: "Equity", color: "var(--chart-1)" },
  debts: { label: "Debts", color: "var(--chart-2)" },
  margin: { label: "Margin", color: "var(--chart-3)" },
}

export const equityChart: ChartConfig = {
  net_equity: { label: "Equity", color: "var(--chart-1)" },
  cumulative_cashflow: { label: "Deposit", color: "var(--chart-2)" },
}

export const returnChart: ChartConfig = {
  portfolio_value: { label: "Equity", color: "var(--chart-1)" },
  vni_value: { label: "VN-Index", color: "var(--chart-2)" },
}

export const netProfitChart: ChartConfig = {
  tax: { label: "Tax", color: "var(--chart-4)" },
  fee: { label: "Fee", color: "var(--chart-3)" },
  interest: { label: "Interest", color: "var(--chart-2)" },
  revenue: { label: "Revenue", color: "var(--chart-1)" },
}

export const expenseChart: ChartConfig = {
  tax: { label: "Tax", color: "var(--chart-4)" },
  fee: { label: "Fee", color: "var(--chart-3)" },
  interest: { label: "Interest", color: "var(--chart-1)" },
}
