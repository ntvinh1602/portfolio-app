import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useAuth } from "@/hooks/useAuth";

export interface Holding {
  ticker: string;
  name: string;
  logo_url: string;
  quantity: number;
  cost_basis: number;
  latest_price: number;
}

export interface CryptoHolding extends Holding {
  latest_usd_rate: number;
}

interface HoldingsData {
  stockHoldings: Holding[];
  cryptoHoldings: CryptoHolding[];
}

export function useHoldings() {
  const { userId } = useAuth();

  const { data, error, isLoading } = useSWR<HoldingsData>(
    userId ? `/api/gateway/${userId}/holdings` : null,
    fetcher
  );

  const stockHoldings =
    data?.stockHoldings?.map((holding) => ({
      ...holding,
      total_amount: holding.quantity * holding.latest_price,
    })) ?? [];

  const cryptoHoldings =
    data?.cryptoHoldings?.map((holding) => ({
      ...holding,
      total_amount:
        holding.quantity * holding.latest_price * holding.latest_usd_rate,
    })) ?? [];

  return {
    stockHoldings,
    cryptoHoldings,
    loading: isLoading,
    error,
  };
}