"use client"

import { useEffect, useState } from "react"
import { StockCard } from "./stock-card"
import { formatCurrency } from "@/lib/utils"

interface StockCardWrapperProps {
  ticker: string;
  name: string;
  logoUrl: string;
  quantity: number;
  costBasis: number;
}

export function StockCardWrapper({ ticker, name, logoUrl, quantity, costBasis }: StockCardWrapperProps) {
  const [price, setPrice] = useState(0)
  const [priceStatus, setPriceStatus] = useState<'loading' | 'error' | 'success'>('loading')

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
      } catch (error) {
        console.error(`Error fetching price for ${ticker}:`, error)
        setPriceStatus('error')
      }
    }

    fetchPrice()
  }, [ticker])

  return (
    <StockCard
      ticker={ticker}
      name={name}
      logoUrl={logoUrl}
      quantity={formatCurrency(quantity)}
      totalAmount={priceStatus === 'success' ? formatCurrency(quantity * price) : "..."}
      pnl={priceStatus === 'success' ? formatCurrency((quantity * price / costBasis - 1) * 100, undefined, 1) : "..."}
      price={formatCurrency(price / 1000, undefined, 2)}
      priceStatus={priceStatus}
    />
  )
}