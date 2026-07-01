import { requestDnse } from "@/features/dnse/client"
import type {
  DnseAccountsResponse,
  DnseBalancesResponse,
  DnseDashboardData,
  DnsePosition,
  DnsePositionsResponse,
} from "@/features/dnse/types"

export async function getDnseAccounts() {
  return requestDnse<DnseAccountsResponse>("GET", "/accounts")
}

export async function getDnseBalances(accountNo: string) {
  return requestDnse<DnseBalancesResponse>(
    "GET",
    `/accounts/${encodeURIComponent(accountNo)}/balances`,
  )
}

export async function getDnseStockPositions(accountNo: string) {
  return requestDnse<DnsePositionsResponse>(
    "GET",
    `/accounts/${encodeURIComponent(accountNo)}/positions`,
    {
      query: {
        marketType: "STOCK",
        pageSize: 20,
      },
    },
  )
}

export async function getDnseDashboardData(
  requestedAccountNo?: string | string[],
): Promise<DnseDashboardData> {
  const accounts = await getDnseAccounts()
  const availableAccounts = accounts.accounts ?? []
  const selectedAccount = pickSelectedAccount(
    availableAccounts,
    requestedAccountNo,
  )

  if (!selectedAccount) {
    return {
      accounts,
      availableAccounts,
      selectedAccount: null,
      balances: null,
      positions: [],
    }
  }

  const [balances, positionsResponse] = await Promise.all([
    getDnseBalances(selectedAccount.id),
    getDnseStockPositions(selectedAccount.id),
  ])

  return {
    accounts,
    availableAccounts,
    selectedAccount,
    balances,
    positions: positionsResponse.positions ?? [],
  }
}

function pickSelectedAccount(
  accounts: DnseAccountsResponse["accounts"],
  requestedAccountNo?: string | string[],
) {
  const normalizedAccountNo = Array.isArray(requestedAccountNo)
    ? requestedAccountNo[0]
    : requestedAccountNo

  if (normalizedAccountNo) {
    const matchedAccount = accounts.find(
      (account) => account.id === normalizedAccountNo,
    )
    if (matchedAccount) {
      return matchedAccount
    }
  }

  return accounts[0] ?? null
}

export function getOpenStockPositions(positions: DnsePosition[]) {
  return positions.filter((position) => resolvePositionQuantity(position) > 0)
}

function resolvePositionQuantity(position: DnsePosition) {
  return (
    position.openQuantity ??
    position.tradeQuantity ??
    position.accumulateQuantity ??
    0
  )
}
