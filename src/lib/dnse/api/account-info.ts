import { requestDnse } from "@/lib/dnse/client"
import type {
  DnseAccountsResponse,
  DnseBalancesResponse,
  DnsePositionsResponse,
} from "@/lib/dnse/dnse.types"

// Account info
export async function getDnseAccounts() {
  return requestDnse<DnseAccountsResponse>("GET", "/accounts")
}

// Cash balance
export async function getDnseBalances(accountNo: string) {
  return requestDnse<DnseBalancesResponse>(
    "GET",
    `/accounts/${encodeURIComponent(accountNo)}/balances`
  )
}

// Loan packages



// Purchasing & selling power



// Intraday orders book



// Order execution details (for derivative only)



// Order history (in the last 1 year)



// Open positions
export async function getDnseStockPositions(accountNo: string) {
  return requestDnse<DnsePositionsResponse>(
    "GET",
    `/accounts/${encodeURIComponent(accountNo)}/positions`,
    {
      query: {
        marketType: "STOCK",
        pageSize: 20,
      },
    }
  )
}


// Open positions details



// Trigger conditions to close positions



// Stock events history (dividend, bonus, options etc.)