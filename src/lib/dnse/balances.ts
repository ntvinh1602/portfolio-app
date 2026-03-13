import { brokerFetch } from "./client"
import { getAccounts } from "./accounts"

export interface DNSEAccountBalance {
  custodyCode: string
  investorAccountId: string
  totalCash: number
  availableCash: number
  totalDebt: number
  withdrawableCash: number
  depositFeeAmount: number
  depositInterest: number
  marginDebt: number
  stockValue: number
  netAssetValue: number
  receivingAmount: number
  secureAmount: number
  cashDividendReceiving: number
}

export async function getAccountBalance(
  accountId: string
): Promise<DNSEAccountBalance> {
  const data = await brokerFetch(
    `/order-service/account-balances/${accountId}`,
    {
      method: "GET",
    }
  )

  return data
}

export async function getPrimaryAccountBalance() {
  const accounts = await getAccounts()

  if (!accounts.length) {
    throw new Error("No accounts found")
  }

  const accountId = accounts[0].id

  return getAccountBalance(accountId)
}