"use client"

import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react"
import {
  StockData,
  CryptoData,
} from "@/app/dashboard/types/dashboard-data"
import { useDNSEData } from "@/hooks/useDNSEData"
import { useBinanceData } from "@/hooks/useBinanceData"
import { useDelayedData } from "@/hooks/useDelayedData"
import { Tables } from "@/types/database.types"

export interface LiveStockData extends StockData {
  totalAmount: number
  pnlPct: number
  pnlNet: number
  price: number
  prevPrice?: number
}

export interface LiveCryptoData extends CryptoData {
  totalAmount: number
  pnlPct: number
  pnlNet: number
  price: number
  prevPrice?: number | null
}

interface LiveDataContextType {
  isLoading: boolean
  totalAssets: number
  setTotalAssets: (value: number) => void
  totalEquity: number
  setTotalEquity: (value: number) => void
  totalLiabilities: number
  processedStockData: LiveStockData[]
  processedCryptoData: LiveCryptoData[]
  balanceSheet: Tables<"balance_sheet">[]
  isStockPriceLive: boolean
  isCryptoPriceLive: boolean
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined)

export const LiveDataProvider = ({ children }: { children: ReactNode }) => {
  const { bsData, stockData, cryptoData, isLoading } = useDelayedData()

  const [totalStockValue, setTotalStockValue] = useState(0)
  const [totalCryptoValue, setTotalCryptoValue] = useState(0)
  const [totalAssets, setTotalAssets] = useState(0)
  const [totalEquity, setTotalEquity] = useState(0)
  const [totalLiabilities, setTotalLiabilities] = useState(0)
  const [unrealizedPnL, setUnrealizedPnL] = useState(0)

  // ===== Live Market Data =====
  const stockSymbols = useMemo(
    () => stockData?.map((s) => s.ticker) ?? [],
    [stockData]
  )
  const {
    data: marketData,
    loading: isStockDataLoading,
    error: stockError
  } = useDNSEData(stockSymbols)

  const cryptoSymbols = useMemo(
    () => cryptoData?.filter((c) => c.ticker !== "USDT").map((c) => c.ticker) ?? [],
    [cryptoData]
  )
  const {
    prices: liveCryptoPrices,
    loading: isCryptoDataLoading,
    error: cryptoError,
  } = useBinanceData(cryptoSymbols)

  const isStockPriceLive = !isStockDataLoading && Object.keys(marketData).length > 0 && !stockError
  const isCryptoPriceLive = !isCryptoDataLoading && Object.keys(liveCryptoPrices).length > 0 && !cryptoError

  // ===== Stock Data =====
  const processedStockData = useMemo(() => {
    if (isLoading) return []

    return stockData
      .map((stock) => {
        const live = marketData[stock.ticker]
        const livePrice = live?.price
        const prevPrice = live?.prevPrice

        const totalAmount = livePrice
          ? livePrice * stock.quantity * 1000
          : stock.market_value

        const pnlNet = totalAmount - stock.cost_basis - totalAmount * 0.00127
        const pnlPct =
          stock.cost_basis > 0
            ? (totalAmount * 0.99873 / stock.cost_basis - 1) * 100
            : 0

        return {
          ...stock,
          totalAmount,
          pnlNet,
          pnlPct,
          price: livePrice ?? stock.price / 1000,
          prevPrice,
        }
      })
      .sort((a, b) => b.totalAmount - a.totalAmount)
  }, [isLoading, stockData, marketData])

  useEffect(() => {
    const total = processedStockData.reduce((acc, s) => acc + s.totalAmount, 0)
    setTotalStockValue(total)
  }, [processedStockData])

  // ===== Crypto Data =====
  const processedCryptoData = useMemo(() => {
    if (isLoading) return []

    return cryptoData
      .map((crypto) => {
        const live = liveCryptoPrices[`${crypto.ticker}USDT`]
        const livePrice = live?.price ? parseFloat(live.price) : crypto.price
        const prevPrice = live?.prevPrice
          ? parseFloat(live.prevPrice)
          : null

        const totalAmount = live?.price
          ? crypto.quantity * parseFloat(live.price) * crypto.fx_rate
          : crypto.market_value

        const pnlNet = totalAmount - crypto.cost_basis
        const pnlPct =
          crypto.cost_basis > 0
            ? (totalAmount / crypto.cost_basis - 1) * 100
            : 0

        return {
          ...crypto,
          totalAmount,
          pnlNet,
          pnlPct,
          price: livePrice,
          prevPrice,
        }
      })
      .sort((a, b) => b.totalAmount - a.totalAmount)
  }, [isLoading, cryptoData, liveCryptoPrices])

  useEffect(() => {
    const total = processedCryptoData.reduce((acc, c) => acc + c.totalAmount, 0)
    setTotalCryptoValue(total)
  }, [processedCryptoData])

  // ===== Combine Balances =====
  useEffect(() => {
    if (!bsData) return

    // Grouping totals from the flat array
    const assets = bsData.filter((r) => r.type === "asset")
    const liabilities = bsData.filter((r) => r.type === "liability")
    const equity = bsData.filter((r) => r.type === "equity")

    const totalAssetsValue = assets.reduce((acc, r) => acc + (r.amount || 0), 0)
    const totalLiabilitiesValue = liabilities.reduce((acc, r) => acc + (r.amount || 0), 0)
    const totalEquityValue = equity.reduce((acc, r) => acc + (r.amount || 0), 0)

    const stockPnL = processedStockData.reduce((acc, s) => acc + s.pnlNet, 0) ?? 0
    const cryptoPnL = processedCryptoData.reduce((acc, c) => acc + c.pnlNet, 0) ?? 0

    setUnrealizedPnL(stockPnL + cryptoPnL)
    setTotalAssets(totalAssetsValue)
    setTotalLiabilities(totalLiabilitiesValue)
    setTotalEquity(totalEquityValue)
  }, [
    bsData,
    processedStockData,
    processedCryptoData,
    totalStockValue,
    totalCryptoValue,
  ])

  // ===== Memoized value =====
  const contextValue = useMemo(
    () => ({
      isLoading,
      totalAssets,
      setTotalAssets,
      totalEquity,
      setTotalEquity,
      totalLiabilities,
      processedStockData,
      processedCryptoData,
      balanceSheet: bsData ?? [],
      isStockPriceLive,
      isCryptoPriceLive,
    }),
    [
      isLoading,
      totalAssets,
      totalEquity,
      totalLiabilities,
      processedStockData,
      processedCryptoData,
      bsData,
      isStockPriceLive,
      isCryptoPriceLive,
    ]
  )

  return (
    <LiveDataContext.Provider value={contextValue}>
      {children}
    </LiveDataContext.Provider>
  )
}

export const useLiveData = () => {
  const context = useContext(LiveDataContext)
  if (context === undefined) {
    throw new Error("useLiveData must be used within a LiveDataProvider")
  }
  return context
}
