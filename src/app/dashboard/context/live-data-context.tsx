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
  BalanceSheetData,
  StockData,
  CryptoData
} from "@/app/dashboard/types/dashboard-data"
import { useDNSEData } from "@/hooks/useDNSEData"
import { useBinanceData } from "@/hooks/useBinanceData"
import { useDelayedData } from "@/hooks/useDelayedData"

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
  processedStockData: LiveStockData[]
  processedCryptoData: LiveCryptoData[]
  balanceSheet: BalanceSheetData
  isStockPriceLive: boolean
  isCryptoPriceLive: boolean
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined)

export const LiveDataProvider = ({ children }: {children: ReactNode}) => {
  const {
    bsData,
    stockData,
    cryptoData,
    isLoading
  } = useDelayedData()

  const [totalStockValue, setTotalStockValue] = useState(0)
  const [totalCryptoValue, setTotalCryptoValue] = useState(0)
  const [totalAssets, setTotalAssets] = useState(0)
  const [totalEquity, setTotalEquity] = useState(0)
  const [unrealizedPnL, setUnrealizedPnL] = useState(0)

  const stockSymbols = useMemo(
    () => stockData?.map((stock) => stock.ticker) ?? [],
    [stockData]
  )
  const {
    data: marketData,
    loading: isStockDataLoading,
    error: stockError
  } = useDNSEData(stockSymbols)

  const cryptoSymbols = useMemo(() =>
    cryptoData?.filter((crypto) => crypto.ticker !== "USDT")
      .map((crypto) => crypto.ticker) ?? [],
    [cryptoData]
  )
  const {
    prices: liveCryptoPrices,
    loading: isCryptoDataLoading,
    error: cryptoError
  } = useBinanceData(cryptoSymbols)

  const isStockPriceLive = !isStockDataLoading && Object.keys(marketData).length > 0 && !stockError
  const isCryptoPriceLive = !isCryptoDataLoading && Object.keys(liveCryptoPrices).length > 0 && !cryptoError

  const processedStockData = useMemo(() => {
    if (isLoading) return []

    return stockData.map((stock) => {
      const liveEntry = marketData[stock.ticker]
      const livePrice = liveEntry?.price
      const prevPrice = liveEntry?.prevPrice   // <--- add this

      const totalAmount = livePrice
        ? livePrice * stock.quantity * 1000
        : stock.total_amount
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
        price: livePrice ?? stock.latest_price / 1000,
        prevPrice, // <--- include it here
      }
    }).sort((a, b) => b.totalAmount - a.totalAmount)
  }, [isLoading, stockData, marketData])

  useEffect(() => {
    if (processedStockData) {
      const newTotalStockValue = processedStockData.reduce(
        (acc, stock) => acc + stock.totalAmount,
        0
      )
      setTotalStockValue(newTotalStockValue)
    }
  }, [processedStockData])

  const processedCryptoData = useMemo(() => {
    if (isLoading) return []

    return cryptoData.map((crypto) => {
      const liveInfo = liveCryptoPrices[`${crypto.ticker}USDT`]

      // Extract price + prevPrice from liveInfo if available
      const livePrice = liveInfo?.price
        ? parseFloat(liveInfo.price)
        : crypto.latest_price

      const prevPrice = liveInfo?.prevPrice
        ? parseFloat(liveInfo.prevPrice)
        : null

      const totalAmount = liveInfo?.price
        ? crypto.quantity * parseFloat(liveInfo.price) * crypto.latest_usd_rate
        : crypto.total_amount

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
        prevPrice, // 👈 added this
      }
    }).sort((a, b) => b.totalAmount - a.totalAmount)
  }, [isLoading, cryptoData, liveCryptoPrices])

  useEffect(() => {
    if (processedCryptoData) {
      const newTotalCryptoValue = processedCryptoData.reduce(
        (acc, crypto) => acc + crypto.totalAmount,
        0
      )
      setTotalCryptoValue(newTotalCryptoValue)
    }
  }, [processedCryptoData])

  useEffect(() => {
    if (bsData) {
      const cash =
        bsData.assets.find((a) => a.type === "Cash")?.totalAmount ?? 0
      const fund =
        bsData.assets.find((a) => a.type === "Fund")?.totalAmount ?? 0
      const accruedInterest =
        bsData.assets.find((a) => a.type === "Accrued Interest")?.totalAmount ??
        0
      const stockPnL =
        processedStockData?.reduce((acc, stock) => acc + stock.pnlNet, 0) ?? 0
      const cryptoPnL =
        processedCryptoData?.reduce((acc, crypto) => acc + crypto.pnlNet, 0) ?? 0
      setUnrealizedPnL(stockPnL + cryptoPnL - accruedInterest)
      setTotalAssets(totalStockValue + totalCryptoValue + cash + fund)
      setTotalEquity(totalAssets - bsData.totalLiabilities)
    }
  }, [
    bsData,
    totalStockValue,
    totalCryptoValue,
    totalAssets,
    processedStockData,
    processedCryptoData,
  ])

  const balanceSheet = useMemo(() => {
    if (isLoading) return bsData

    return {
      ...bsData,
      assets: bsData.assets.map((asset) => {
        if (asset.type === "Stocks")
          return { ...asset, totalAmount: totalStockValue }
        if (asset.type === "Crypto")
          return { ...asset, totalAmount: totalCryptoValue }
        return asset
      }),
      totalAssets,
      equity: bsData.equity.map((equityItem) => {
        if (equityItem.type === "Unrealized P/L")
          return { ...equityItem, totalAmount: unrealizedPnL }
        if (equityItem.type === "Owner Capital")
          return { ...equityItem, totalAmount: totalEquity - unrealizedPnL }
        return equityItem
      }),
      totalEquity,
    }
  }, [
    isLoading,
    bsData,
    totalStockValue,
    totalCryptoValue,
    totalAssets,
    totalEquity,
    unrealizedPnL,
  ])

  return (
    <LiveDataContext.Provider
      value={{
        isLoading,
        totalAssets,
        setTotalAssets,
        totalEquity,
        setTotalEquity,
        processedStockData,
        processedCryptoData,
        balanceSheet,
        isStockPriceLive,
        isCryptoPriceLive,
      }}
    >
      {children}
    </LiveDataContext.Provider>
  )
}

export const useLiveData = () => {
  const context = useContext(LiveDataContext)
  if (context === undefined) {
    throw new Error("useAssetData must be used within a AssetDataProvider")
  }
  return context
}
