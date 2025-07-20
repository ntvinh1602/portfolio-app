import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface CryptoHoldingBase {
  ticker: string;
  name: string;
  logo_url: string;
  quantity: number;
  cost_basis: number;
  latest_price: number;
}

export function useCryptoHoldings() {
  const { data, error, isLoading } = useSWR<CryptoHoldingBase[]>('/api/query/crypto-holdings', fetcher);

  const cryptoHoldings = data?.map((holding) => ({
    ...holding,
    total_amount: holding.quantity * holding.latest_price,
  })) ?? [];

  return { cryptoHoldings, loading: isLoading, error };
}