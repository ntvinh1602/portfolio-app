import { useEffect, useState } from "react"

interface BinanceKline {
  e: string // Event type
  E: number // Event time
  s: string // Symbol
  k: {
    t: number // Kline start time
    T: number // Kline close time
    s: string // Symbol
    i: string // Interval
    f: number // First trade ID
    L: number // Last trade ID
    o: string // Open price
    c: string // Close price
    h: string // High price
    l: string // Low price
    v: string // Base asset volume
    n: number // Number of trades
    x: boolean // Is this kline closed?
    q: string // Quote asset volume
    V: string // Taker buy base asset volume
    Q: string // Taker buy quote asset volume
    B: string // Ignore
  }
}

export const useBTCUSDTPrice = () => {
  const [price, setPrice] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Event | null>(null)

  useEffect(() => {
    const ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@kline_1m")

    ws.onopen = () => {
      console.log("WebSocket connection opened for BTCUSDT")
      setLoading(false)
    }

    ws.onmessage = (event) => {
      const klineData: BinanceKline = JSON.parse(event.data)
      if (klineData.k && klineData.k.c) {
        setPrice(klineData.k.c)
      }
    }

    ws.onerror = (event) => {
      console.error("WebSocket error:", event)
      setError(event)
      setLoading(false)
    }

    ws.onclose = () => {
      console.log("WebSocket connection closed for BTCUSDT")
    }

    return () => {
      ws.close()
    }
  }, [])

  return { price, loading, error }
}