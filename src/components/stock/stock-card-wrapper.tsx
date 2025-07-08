"use client"

import { useEffect, useState } from "react"
import { StockCard } from "./stock-layout"
import { formatNum } from "@/lib/utils"

interface StockCardWrapperProps {
  ticker: string;
  name: string;
  logoUrl: string;
  quantity: number;
  costBasis: number;
  refreshKey: number;
  lastUpdatedPrice: number;
  onRefreshComplete: () => void;
}

export function StockCardWrapper({ ticker, name, logoUrl, quantity, costBasis, refreshKey, lastUpdatedPrice, onRefreshComplete }: StockCardWrapperProps) {
  const [price, setPrice] = useState(lastUpdatedPrice || 0)
  const [priceStatus, setPriceStatus] = useState<'loading' | 'error' | 'success'>(lastUpdatedPrice ? 'success' : 'loading')

  useEffect(() => {
    async function fetchPrice() {
      setPriceStatus('loading')
      try {
        const response = await fetch(`/api/market-data?ticker=${ticker}`)
        if (!response.ok) {
          throw new Error('Failed to fetch price')
        }
        const data = await response.json()
        setPrice(data.price)
        setPriceStatus('success')

        // Save the new price to the database
        await fetch('/api/stock-price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ticker, price: data.price }),
        });

      } catch (error) {
        console.error(`Error fetching price for ${ticker}:`, error)
        setPriceStatus('error')
      } finally {
        if (refreshKey > 0) {
          onRefreshComplete();
        }
      }
    }

    if (refreshKey > 0) {
      fetchPrice()
    }
  }, [refreshKey, ticker, onRefreshComplete])

  return (
    <StockCard
      ticker={ticker}
      name={name}
      logoUrl={logoUrl}
      quantity={formatNum(quantity)}
      totalAmount={priceStatus === 'success' ? formatNum(quantity * price) : "..."}
      pnl={priceStatus === 'success' ? formatNum((quantity * price / costBasis - 1) * 100, undefined, 1) : "..."}
      price={formatNum(price / 1000, undefined, 2)}
      priceStatus={priceStatus}
    />
  )
}