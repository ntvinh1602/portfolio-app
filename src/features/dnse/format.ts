import type {
  DnseAccount,
  DnseAccountOption,
  DnseAccountsResponse,
  DnseBalancesResponse,
  DnseHoldingItem,
  DnseMetricTone,
  DnseOverviewModel,
  DnsePosition,
} from "@/features/dnse/types"

export function buildAccountOptions(accounts: DnseAccount[]): DnseAccountOption[] {
  return accounts.map((account) => {
    const traits = [
      account.dealAccount ? "Deal" : "Standard",
      account.derivativeAccount ? "Derivative enabled" : "Stock only",
    ]

    return {
      value: account.id,
      label: account.id,
      description: traits.join(" · "),
    }
  })
}

export function buildOverviewModel(
  accounts: DnseAccountsResponse,
  selectedAccount: DnseAccount,
  balances: DnseBalancesResponse | null,
  positions: DnsePosition[]
): DnseOverviewModel {
  const stock = balances?.stock
  const openPositions = positions.filter((position) => getPositionQuantity(position) > 0)
  const positionsMarketValue = openPositions.reduce((total, position) => {
    const quantity = getPositionQuantity(position)
    const marketPrice = position.marketPrice ?? position.costPrice ?? 0
    return total + quantity * marketPrice
  }, 0)

  return {
    investorName: accounts.name,
    custodyCode: accounts.custodyCode,
    investorId: accounts.investorId,
    accountId: selectedAccount.id,
    derivativeStatus: selectedAccount.derivative?.status ?? "N/A",
    hasDerivative: Boolean(selectedAccount.derivativeAccount),
    isDealAccount: Boolean(selectedAccount.dealAccount),
    metrics: [
      {
        label: "Total Cash",
        value: formatCurrency(stock?.totalCash),
      },
      {
        label: "Available Cash",
        value: formatCurrency(stock?.availableCash),
      },
      {
        label: "Withdrawable",
        value: formatCurrency(stock?.withdrawableCash),
      },
      {
        label: "Total Debt",
        value: formatCurrency(stock?.totalDebt),
        tone: resolveMetricTone(stock?.totalDebt, true),
      },
      {
        label: "Dividend Pending",
        value: formatCurrency(stock?.cashDividendReceiving),
      },
      {
        label: "Stock Holdings",
        value: formatInteger(openPositions.length),
      },
      {
        label: "Portfolio Value",
        value: formatCurrency(positionsMarketValue),
      },
    ],
  }
}

export function buildHoldingItems(positions: DnsePosition[]): DnseHoldingItem[] {
  return positions
    .filter((position) => getPositionQuantity(position) > 0)
    .map((position) => {
      const quantity = getPositionQuantity(position)
      const marketValue = calculateMarketValue(position)
      const pnl = calculateUnrealizedPnl(position)

      return {
        id: String(position.id),
        symbol: position.symbol,
        status: position.status,
        quantity: formatInteger(quantity),
        averagePrice: formatPrice(position.costPrice),
        marketPrice: formatPrice(position.marketPrice),
        marketValue: formatCurrency(marketValue),
        pnl: formatSignedCurrency(pnl),
        pnlTone: resolveMetricTone(pnl),
      }
    })
    .sort((left, right) => {
      const leftValue = parseCurrencyValue(left.marketValue)
      const rightValue = parseCurrencyValue(right.marketValue)
      return rightValue - leftValue
    })
}

export function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) {
    return "N/A"
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPrice(value?: number | null) {
  if (value === null || value === undefined) {
    return "N/A"
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatInteger(value?: number | null) {
  if (value === null || value === undefined) {
    return "0"
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatSignedCurrency(value?: number | null) {
  if (value === null || value === undefined) {
    return "N/A"
  }

  const prefix = value > 0 ? "+" : ""
  return `${prefix}${formatCurrency(value)}`
}

function resolveMetricTone(
  value?: number | null,
  inverse = false
): DnseMetricTone {
  if (value === null || value === undefined || value === 0) {
    return "muted"
  }

  if (inverse) {
    return value > 0 ? "negative" : "positive"
  }

  return value > 0 ? "positive" : "negative"
}

function getPositionQuantity(position: DnsePosition) {
  return (
    position.openQuantity ??
    position.tradeQuantity ??
    position.accumulateQuantity ??
    0
  )
}

function calculateMarketValue(position: DnsePosition) {
  const price = position.marketPrice ?? position.costPrice
  if (price === null || price === undefined) {
    return null
  }

  return getPositionQuantity(position) * price
}

function calculateUnrealizedPnl(position: DnsePosition) {
  if (position.marketPrice === undefined || position.costPrice === undefined) {
    return null
  }

  return getPositionQuantity(position) * (position.marketPrice - position.costPrice)
}

function parseCurrencyValue(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0
}
