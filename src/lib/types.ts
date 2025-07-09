export interface StockHoldingBase {
  ticker: string;
  name: string;
  logo_url: string;
  quantity: number;
  cost_basis: number;
  latest_price: number;
}

export interface StockHolding extends StockHoldingBase {
  total_amount: number;
}