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

export const useCryptoData = (symbols: string[] = []) => {
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Event | null>(null)

  useEffect(() => {
    if (symbols.length === 0) {
      setLoading(false)
      return
    }

    const streams = symbols.map((s) => `${s.toLowerCase()}usdt@kline_1m`).join("/")
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`)

    ws.onopen = () => {
      console.log(`WebSocket connection opened for ${symbols.join(", ")}`)
      setLoading(false)
    }

    ws.onmessage = (event) => {
      const klineData: BinanceKline = JSON.parse(event.data)
      if (klineData.k && klineData.k.c) {
        setPrices((prevPrices) => ({
          ...prevPrices,
          [klineData.s]: klineData.k.c
        }))
      }
    }

    ws.onerror = (event) => {
      console.error("WebSocket error:", event)
      setError(event)
      setLoading(false)
    }

    ws.onclose = () => {
      console.log(`WebSocket connection closed for ${symbols.join(", ")}`)
    }

    return () => {
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      ws.close()
    }
  }, [symbols])

  return { prices, loading, error }
}