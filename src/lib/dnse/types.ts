export type DnseMetricTone = "default" | "positive" | "negative" | "muted"

export interface DnseAccount {
  id: string
  dealAccount?: boolean
  derivativeAccount?: boolean
  derivative?: {
    status?: string | null
  } | null
}

export interface DnseAccountsResponse {
  name: string
  custodyCode: string
  investorId: string
  accounts: DnseAccount[]
}

export interface DnseStockBalance {
  totalCash?: number
  availableCash?: number
  depositInterest?: number
  totalDebt?: number
  depositFeeAmount?: number
  secureAmount?: number
  orderSecured?: number
  withdrawableCash?: number
  cashDividendReceiving?: number
}

export interface DnseBalancesResponse {
  stock?: DnseStockBalance | null
  derivative?: Record<string, number | string | null> | null
}

export interface DnsePosition {
  id: number
  marketType: "STOCK" | "DERIVATIVE" | string
  symbol: string
  accountNo: string
  status: string
  loanPackageId?: number
  side?: "NB" | "NS" | string
  accumulateQuantity?: number
  tradeQuantity?: number
  closedQuantity?: number
  openQuantity?: number
  overNightQuantity?: number
  costPrice?: number
  marketPrice?: number
  breakEvenPrice?: number
  averageClosePrice?: number
  createdDate?: string
  modifiedDate?: string
}

export interface DnsePositionsResponse {
  positions: DnsePosition[]
  pageIndex?: number
  pageSize?: number
  pageNumber?: number
  total?: number
}

export interface DnseDashboardData {
  accounts: DnseAccountsResponse
  availableAccounts: DnseAccount[]
  selectedAccount: DnseAccount | null
  balances: DnseBalancesResponse | null
  positions: DnsePosition[]
}

export interface DnseAccountOption {
  value: string
  label: string
  description: string
}

export interface DnseSummaryMetric {
  label: string
  value: string
  tone?: DnseMetricTone
}

export interface DnseOverviewModel {
  investorName: string
  custodyCode: string
  investorId: string
  accountId: string
  derivativeStatus: string
  hasDerivative: boolean
  isDealAccount: boolean
  metrics: DnseSummaryMetric[]
}

export interface DnseHoldingItem {
  id: string
  symbol: string
  status: string
  quantity: string
  averagePrice: string
  marketPrice: string
  marketValue: string
  pnl: string
  pnlTone: DnseMetricTone
}
