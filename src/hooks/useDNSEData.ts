import { useState, useEffect, useMemo } from "react"

interface PriceData {
  symbol: string
  price: number
  quantity: number
  side: string
  time: string
  prevPrice: number
}

export function useDNSEData(symbols: string[] = []) {
  const [data, setData] = useState<Record<string, PriceData>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const symbolString = useMemo(() => symbols.join(","), [symbols])

  useEffect(() => {
    if (symbols.length === 0) return

    let eventSource: EventSource | null = null
    let reconnectTimer: NodeJS.Timeout | null = null
    let isMounted = true

    const connectStream = async () => {
      try {
        setLoading(true)

        // 1. Fetch token from cached API
        const authRes = await fetch("/api/external/dnse/auth")
        if (authRes.status === 403) {
          setError("Market is closed.")
          setLoading(false)
          eventSource?.close()
          if (reconnectTimer) clearTimeout(reconnectTimer)
          return
        }
        if (!authRes.ok) {
          setError("Authentication failed.")
          setLoading(false)
          return
        }
        const { token } = await authRes.json()
        if (!token) {
          setError("No token received from server.")
          setLoading(false)
          return
        }

        // 2. Open SSE stream
        setError(null)
        eventSource = new EventSource(
          `/api/external/dnse/stream?symbols=${symbolString}&token=${token}`
        )

        eventSource.onmessage = (event) => {
          try {
            const priceData: PriceData = JSON.parse(event.data)
            if (!isMounted) return

            setData((prevData) => {
              const prevPrice = prevData[priceData.symbol]?.price
              return {
                ...prevData,
                [priceData.symbol]: { ...priceData, prevPrice },
              }
            })

            // stop loading once first message arrives
            setLoading(false)
          } catch (e) {
            console.error("Failed to parse SSE message:", e)
          }
        }

        eventSource.onerror = (e) => {
          console.error("SSE connection failed:", e)
          setError("Market data stream disconnected.")
          setLoading(true) // show loading again while reconnecting
          eventSource?.close()

          // reconnect after 5s
          if (reconnectTimer) clearTimeout(reconnectTimer)
          reconnectTimer = setTimeout(() => {
            if (isMounted) connectStream()
          }, 5000)
        }
      } catch (e) {
        console.error("Stream connection error:", e)
        setError("Network error.")
        setLoading(true)
      }
    }

    connectStream()

    return () => {
      isMounted = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      eventSource?.close()
    }
  }, [symbolString, symbols.length])

  return { data, error, loading }
}
