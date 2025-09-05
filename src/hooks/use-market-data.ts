"use client"

import { useState, useEffect, useMemo } from "react"

interface PriceData {
  symbol: string
  price: number
  quantity: number
  side: string
  time: string
}

export function useMarketData(symbols: string[] = []) {
  const [data, setData] = useState<Record<string, PriceData>>({})
  const symbolString = useMemo(() => symbols.join(","), [symbols])

  useEffect(() => {
    if (symbols.length === 0) {
      return
    }

    const eventSource = new EventSource(`/api/market-data?symbols=${symbolString}`)

    eventSource.onmessage = (event) => {
      const priceData: PriceData = JSON.parse(event.data)
      setData((prevData) => ({
        ...prevData,
        [priceData.symbol]: priceData
      }))
    }

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [symbolString, symbols.length])

  return { data }
}