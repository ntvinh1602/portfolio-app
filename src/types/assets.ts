export interface SummaryItem {
  type: string
  totalAmount: number
}

export interface AssetSummaryData {
  assets: SummaryItem[]
  totalAssets: number
  liabilities: SummaryItem[]
  totalLiabilities: number
  equity: SummaryItem[]
  totalEquity: number
}
