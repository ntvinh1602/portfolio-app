import { BenchmarkChartCols } from "./fund.types"


export function colsToRows({ d, p, v }: BenchmarkChartCols) {
  const out = new Array(d.length)
  for (let i = 0; i < d.length; i++) {
    out[i] = { t: d[i] * 86_400_000, portfolio_value: p[i], vni_value: v[i] }
  }
  return out
}