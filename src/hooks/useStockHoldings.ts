import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient';
import { StockHolding, StockHoldingBase } from '@/lib/types';

export function useStockHoldings() {
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function fetchStockHoldings() {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_stock_holdings');

        if (error) {
          throw error;
        }

        if (data) {
          const holdingsWithTotalAmount: StockHolding[] = (data as StockHoldingBase[]).map((holding: StockHoldingBase) => ({
            ...holding,
            total_amount: holding.quantity * holding.latest_price,
          }));
          setStockHoldings(holdingsWithTotalAmount);
        }
      } catch (error) {
        setError(error);
        console.error('Error fetching stock holdings:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStockHoldings();
  }, []);

  return { stockHoldings, loading, error };
}