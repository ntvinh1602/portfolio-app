type dnseOrderType = "Pending" 
  | "PendingNew" 
  | "New" 
  | "PartiallyFilled" 
  | "Filled" 
  | "Rejected" 
  | "Expired" 
  | "DoneForDay"

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

export interface DnseOrderDetailsRes {
  id: number
  side: "NB" | "NS"
  accountNo: string
  symbol: string
  price: number // order placed price
  quantity: number // placed volume
  orderType: "LO" | "MOK" | "MAK" | "MTL" | "ATO" | "ATC" | "PLO"
  loanPackageId: number
  orderCategory: "NORMAL"
  orderStatus: dnseOrderType
  fillQuantity: number // filled quantity up to now
  lastQuantity: number // last filled quantity
  lastPrice: number // last matched price
  averagePrice: number
  transDate: string
  taxRate: number
  exchangeFeeRate: number
  feeRate: number
  leaveQuantity: number // unmatched quantity
  canceledQuantity: number
  error: string
  marketType: "DERIVATIVE" | "STOCK"
  priceSecure: number
  createdDate: string // ISO 8601 datetime
  modifiedDate: string // ISO 8601 datetime
  metadata: string // json string
  reports: unknown[]
}

export interface DnseClosePrice {
  prices: Array<{
    marketId: "DVX" | "HCX" | "STO" | "STX" | "UPX"
    boardId: "G1" | "G4" | "T1" | "T3" | "T4" | "T6"
    isin: string
    symbol: string
    closePrice: number
    time: string
  }>
}

export interface DnsePosition {
  id: number
  marketType: "STOCK" | "DERIVATIVE"
  symbol: string
  accountNo: string
  status: "OPEN" | "PENDING_CLOSE" | "CLOSED" | "ODD_LOT"
  loanPackageId?: number
  side?: "NB" | "NS"
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