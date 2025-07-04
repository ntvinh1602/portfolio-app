"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/supabaseClient"
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
}

export function StockCardWrapper({ ticker, name, logoUrl, quantity, costBasis, refreshKey, lastUpdatedPrice }: StockCardWrapperProps) {
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
        // Note: This is a simplified example. In a real application, you would
        // likely want to handle this more robustly, perhaps with a dedicated
        // API route and proper error handling.
        const { error } = await supabase
          .from('assets')
          .update({ last_updated_price: data.price })
          .eq('ticker', ticker)
        
        if (error) {
          console.error(`Error updating price for ${ticker}:`, error)
        }

      } catch (error) {
        console.error(`Error fetching price for ${ticker}:`, error)
        setPriceStatus('error')
      }
    }

    if (refreshKey > 0) {
      fetchPrice()
    }
  }, [refreshKey, ticker])

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