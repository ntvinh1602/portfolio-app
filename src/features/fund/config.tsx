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
  File,
} from "lucide-react"
import { ChartConfig } from "@/components/ui/chart"
import { IconLabel, InfoLabel } from "@/types/global.types"

/* --- TIME PRESETS --- */
export const withAllTime = [
  { key: "last_3m", label: "3 months", icon: File },
  { key: "last_6m", label: "6 months", icon: File },
  { key: "last_1y", label: "1 year", icon: File },
  { key: "all", label: "All time", icon: File },
] as const satisfies readonly IconLabel[]

export const withCustom = [
  { key: "1M", label: "Last 1 months", icon: File },
  { key: "3M", label: "Last 3 months", icon: File },
  { key: "6M", label: "Last 6 months", icon: File },
  { key: "1Y", label: "Last 1 year", icon: File },
  { key: "CUSTOM", label: "Custom", icon: File },
] as const satisfies readonly IconLabel[]

/* --- TRANSACTIONS --- */
export const txCategory: IconLabel[] = [
  { key: "stock", label: "Stock", icon: Box },
  { key: "cashflow", label: "Cashflow", icon: Banknote },
  { key: "debt", label: "Debt", icon: HandCoins },
]

export const txOps: IconLabel[] = [
  { key: "buy", label: "Buy", icon: ArrowBigDownDash },
  { key: "sell", label: "Sell", icon: ArrowBigUpDash },
  { key: "deposit", label: "Deposit", icon: Download },
  { key: "withdraw", label: "Withdraw", icon: Upload },
  { key: "income", label: "Income", icon: TrendingUp },
  { key: "expense", label: "Expense", icon: TrendingDown },
  { key: "borrow", label: "Borrow", icon: HandCoins },
  { key: "repay", label: "Repay", icon: Handshake },
]

export const cashflowOps: InfoLabel[] = [
  { key: "deposit", label: "Deposit", info: "For a bright future" },
  { key: "withdraw", label: "Withdraw", info: "Time for shopping" },
  { key: "income", label: "Income", info: "Payday!" },
  { key: "expense", label: "Expense", info: "So expensive!" },
]

export const stockOps: InfoLabel[] = [
  { key: "buy", label: "Buy", info: "Is it bottom yet?" },
  { key: "sell", label: "Sell", info: "Time to cash out!" },
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