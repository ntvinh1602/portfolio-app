import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface StockHoldingBase {
  ticker: string;
  name: string;
  logo_url: string;
  quantity: number;
  cost_basis: number;
  latest_price: number;
}

export function useStockHoldings() {
  const { data, error, isLoading } = useSWR<StockHoldingBase[]>('/api/query/stock-holdings', fetcher);

  const stockHoldings = data?.map((holding) => ({
    ...holding,
    total_amount: holding.quantity * holding.latest_price,
  })) ?? [];

  return { stockHoldings, loading: isLoading, error };
}