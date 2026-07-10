type OrderStatus =
  | "Pending"
  | "PendingNew"
  | "New"
  | "PartiallyFilled"
  | "Filled"
  | "Rejected"
  | "Expired"
  | "DoneForDay"

type OrderType = "LO" | "MOK" | "MAK" | "MTL" | "ATO" | "ATC" | "PLO"
export type MarketType = "STOCK" | "DERIVATIVE"
type OrderSide = "NB" | "NS"

export interface DnseAccountsResponse {
  name: string
  custodyCode: string // VSD depository account number
  investorId: string
  accounts: {
    id: string
    dealAccount: boolean
    derivativeAccount: boolean
    derivative: {
      status: "ACTIVE" | "INACTIVE"
    }
  }[]
}

export interface DnseBalancesResponse {
  stock: {
    totalCash: number
    availableCash: number
    depositInterest: number
    totalDebt: number
    depositFeeAmount: number
    secureAmount: number
    orderSecured: number
    withdrawableCash: number
    cashDividendReceiving: number
  }
  derivative: {
    pendingDepositWithdraw: number
    remainSecure: number
    usedSecure: number
    pendingSecure: number
    holdTaxAndFee: number
    totalLoanDebt: number
  }
}

export interface DnseLoanPackagesRes {
  symbolType: string
  marketType: MarketType
  loanPackages: {
    id: number
    name: string
    initialRate: number
    maintenanceRate: number
    liquidRate: number
    tradingFee: {
      id: number
      name: string
      scope: number
      channel: number
      schemaType: "FIXED" | "PROGRESSIVE"
      createdDate: string
      modifiedDate: string
      fixedTradingFee: number
      fixedDailyCloseTradingFee: number
      progressTradingFee: {
        fromQuantity: number
        toQuantity: number
        fee: number
      }[]
      progressDailyCloseTradingFee: {
        fromQuantity: number
        toQuantity: number
        fee: number
      }[]
    }
  }[]
}

export interface DnsePPSERes {
  qmaxBuy: number
  qmaxSell: number
  price: number
}

export interface DnseIntradayOrdersRes {
  orders: {
    id: number
    side: OrderSide
    accountNo: string
    symbol: string
    price: number
    priceSecure: number
    averagePrice: number
    quantity: number
    fillQuantity: number
    canceledQuantity: number
    leaveQuantity: number
    orderType: OrderType
    orderCategory: string
    orderStatus: OrderStatus
    loanPackageId: number
    marketType: MarketType
    transDate: string
    createdDate: string
    modifiedDate: string
  }[]
}

export interface DnseOrderDetailsRes {
  id: number
  side: OrderSide
  accountNo: string
  symbol: string
  price: number // order placed price
  quantity: number // placed volume
  orderType: OrderType
  loanPackageId: number
  orderCategory: string
  orderStatus: OrderStatus
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
  marketType: MarketType
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
  marketType: MarketType
  symbol: string
  accountNo: string
  status: "OPEN" | "PENDING_CLOSE" | "CLOSED" | "ODD_LOT"
  loanPackageId: number
  side: OrderSide
  accumulateQuantity: number
  tradeQuantity: number
  closedQuantity: number
  openQuantity: number
  overNightQuantity: number
  costPrice: number
  marketPrice: number
  breakEvenPrice: number
  averageClosePrice: number
  createdDate: string
  modifiedDate: string
}

export interface DnsePositionsResponse {
  positions: DnsePosition[]
  pageIndex: number
  pageSize: number
  pageNumber: number
  total: number
}
