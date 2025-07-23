import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

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
  const { data, error, isLoading } = useSWR<HoldingsData>(
    "/api/gateway/holdings",
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