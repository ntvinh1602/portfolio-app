import { brokerFetch } from "./client"

export interface DNSEAccount {
  id: string
  custodyCode: string
  investorId: string
  accountTypeName: string
  derivativeAccount: boolean
}

interface AccountsResponse {
  accounts: DNSEAccount[]
}

export async function getAccounts(): Promise<DNSEAccount[]> {
  const data: AccountsResponse = await brokerFetch(
    "/order-service/accounts",
    {
      method: "GET",
    }
  )

  return data.accounts
}