import { useState, useEffect } from 'react';

interface UseStockPriceProps {
  ticker: string;
  refreshKey: number;
  lastUpdatedPrice: number;
  onRefreshComplete: () => void;
}

export function useStockPrice({ ticker, refreshKey, lastUpdatedPrice, onRefreshComplete }: UseStockPriceProps) {
  const [price, setPrice] = useState(lastUpdatedPrice || 0);
  const [priceStatus, setPriceStatus] = useState<'loading' | 'error' | 'success'>(lastUpdatedPrice ? 'success' : 'loading');

  useEffect(() => {
    async function fetchPrice() {
      setPriceStatus('loading');
      try {
        const response = await fetch(`/api/market-data?ticker=${ticker}`);
        if (!response.ok) {
          throw new Error('Failed to fetch price');
        }
        const data = await response.json();
        setPrice(data.price);
        setPriceStatus('success');

        // Save the new price to the database
        await fetch('/api/stock-price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ticker, price: data.price }),
        });

      } catch (error) {
        console.error(`Error fetching price for ${ticker}:`, error);
        setPriceStatus('error');
      } finally {
        if (refreshKey > 0) {
          onRefreshComplete();
        }
      }
    }

    if (refreshKey > 0) {
      fetchPrice();
    }
  }, [refreshKey, ticker, onRefreshComplete]);

  return { price, priceStatus };
}