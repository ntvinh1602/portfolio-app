"use client"

import { useState, useEffect, useMemo } from "react"

interface PriceData {
  symbol: string
  price: number
  quantity: number
  side: string
  time: string
}

export function useStockData(symbols: string[] = []) {
  const [data, setData] = useState<Record<string, PriceData>>({})
  const [error, setError] = useState<string | null>(null)
  const symbolString = useMemo(() => symbols.join(","), [symbols])

  useEffect(() => {
    if (symbols.length === 0) {
      return
    }

    let eventSource: EventSource | null = null

    const checkMarketStatusAndConnect = async () => {
      try {
        const response = await fetch(`/api/market-data?symbols=${symbolString}`, { method: "HEAD" })
        if (response.status === 403) {
          const errorMessage = await response.text()
          setError(errorMessage)
          return
        } else if (!response.ok) {
          setError("Failed to connect to market data. Please try again later.")
          return
        }

        setError(null) // Clear any previous errors
        eventSource = new EventSource(`/api/market-data?symbols=${symbolString}`)

        eventSource.onmessage = (event) => {
          const priceData: PriceData = JSON.parse(event.data)
          setData((prevData) => ({
            ...prevData,
            [priceData.symbol]: priceData
          }))
        }

        eventSource.onerror = (e) => {
          console.error("EventSource failed:", e)
          setError("Market data stream failed. Please try again later.")
          eventSource?.close()
        }
      } catch (e) {
        console.error("Failed to fetch market data status:", e)
        setError("Network error or server is unreachable.")
      }
    }

    checkMarketStatusAndConnect()

    return () => {
      eventSource?.close()
    }
  }, [symbolString, symbols.length])

  return { data, error }
}