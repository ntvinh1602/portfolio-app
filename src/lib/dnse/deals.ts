import { brokerFetch } from "./client"
import { getAccounts } from "./accounts"

export interface DNSEDeal {
  id: number
  symbol: string
  accountNo: string
  orderIds: string[]
  status: "OPEN" | "CLOSED"
  loanPackageId: string | null
  side: "NB" | "NS"
  secure: number
  accumulateQuantity: number
  tradeQuantity: number
  closedQuantity: number
  t0ReceivingQuantity: number
  t1ReceivingQuantity: number
  t2ReceivingQuantity: number
  costPrice: number
  averageCostPrice: number
  marketPrice: number
  realizedProfit: number
  realizedTotalTaxAndFee: number
  collectedBuyingFee: number
  collectedBuyingTax: number
  collectedSellingFee: number
  collectedSellingTax: number
  collectedStockTransferFee: number
  collectedInterestFee: number
  estimateRemainTaxAndFee: number
  unrealizedProfit: number
  breakEvenPrice: number
  dividendReceivingQuantity: number
  dividendQuantity: number
  cashReceiving: number
  rightReceivingCash: number
  t0ReceivingCash: number
  t1RecevingCash: number
  t2RecevingCash: number
  createdDate: string
  modifiedDate: string
  currentDebt: number
  currentInterest: number
  unrealizedOpenTaxAndFee: number
  currentDebtExcludeToCollect: number
  accumulateSecure: number
  accumulateDebt: number
  averageClosePrice: number
  currentInterestExcludeToCollect: number
}

interface DealsResponse {
  deals: DNSEDeal[]
}

export async function getDeals(accountId: string): Promise<DNSEDeal[]> {
  const data: DealsResponse = await brokerFetch(
    `/deal-service/deals?accountNo=${accountId}`,
    { method: "GET" }
  )

  return data.deals
}

// convenience helper for primary account
export async function getPrimaryAccountDeals(): Promise<DNSEDeal[]> {
  const accounts = await getAccounts()
  if (!accounts.length) throw new Error("No accounts found")

  const accountId = accounts[0].id
  return getDeals(accountId)
}