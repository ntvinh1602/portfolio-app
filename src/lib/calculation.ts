export function calculateCAGR(beginningValue: number, endingValue: number, years: number): number {
  if (beginningValue <= 0 || endingValue <= 0 || years <= 0) {
    return 0;
  }
  return (Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100;
}

export function calculateSharpeRatio(monthlyReturns: number[], annualRiskFreeRate: number): number {
  const n = monthlyReturns.length;
  if (n === 0) {
    return 0;
  }

  const meanReturn = monthlyReturns.reduce((acc, val) => acc + val, 0) / n;
  const monthlyRiskFreeRate = Math.pow(1 + annualRiskFreeRate, 1 / 12) - 1;

  // Population standard deviation of the monthly returns (like Excel's STDEVP)
  const variance = monthlyReturns.reduce((acc, val) => acc + Math.pow(val - meanReturn, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return 0;
  }

  // Calculate the Sharpe Ratio and annualize it
  const sharpeRatio = (meanReturn - monthlyRiskFreeRate) / stdDev;
  return sharpeRatio * Math.sqrt(12);
}