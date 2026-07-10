import { requestDnse } from "@/lib/dnse/client"
import type {
  DnseAccountsResponse,
  DnseBalancesResponse,
  DnsePositionsResponse,
  DnseLoanPackagesRes,
  DnsePPSERes,
  DnseIntradayOrdersRes,
  MarketType,
} from "@/lib/dnse/dnse.types"

// Account info
export async function getDnseAccounts() {
  return requestDnse<DnseAccountsResponse>("GET", "/accounts")
}

// Cash balance
export async function getDnseBalances(accountNo: string) {
  return requestDnse<DnseBalancesResponse>(
    "GET",
    `/accounts/${encodeURIComponent(accountNo)}/balances`,
  )
}

// Loan packages
export async function getLoanPackages(
  accountNo: string,
  marketType: MarketType,
  symbol: string,
) {
  return requestDnse<DnseLoanPackagesRes>(
    "GET",
    `/accounts/${encodeURIComponent(accountNo)}/loan-packages`,
    {
      query: {
        marketType: marketType,
        symbol: symbol,
      },
    },
  )
}

// Purchasing & selling power
export async function getPpse(
  accountNo: string,
  marketType: MarketType,
  symbol: string,
  loanPackageId: string,
  price: string,
) {
  return requestDnse<DnsePPSERes>(
    "GET",
    `/accounts/${encodeURIComponent(accountNo)}/ppse`,
    {
      query: {
        marketType: marketType,
        symbol: symbol,
        loanPackageId: loanPackageId,
        price: price,
      },
    },
  )
}

// Intraday orders book
export async function getIntradayOrders(
  accountNo: string,
  marketType: MarketType,
  orderCategory: string,
) {
  return requestDnse<DnseIntradayOrdersRes>(
    "GET",
    `/accounts/${encodeURIComponent(accountNo)}/orders`,
    {
      query: {
        marketType: marketType,
        orderCategory: orderCategory,
      },
    },
  )
}

// Order execution details (for derivative only)

// Order history (in the last 1 year)

// Open positions
export async function getDnseStockPositions(
  accountNo: string,
  marketType: MarketType,
) {
  return requestDnse<DnsePositionsResponse>(
    "GET",
    `/accounts/${encodeURIComponent(accountNo)}/positions`,
    {
      query: {
        marketType: marketType,
        pageSize: 20,
      },
    },
  )
}

// Open positions details

// Trigger conditions to close positions

// Stock events history (dividend, bonus, options etc.)
