import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Capitalization formatter for asset class
export function assetClassFormatter(value: string) {
  if (value === "fund")
    return value.toUpperCase()
  else 
    return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) 
}

// Format number based on currency and decimal places
export function formatNum(amount: number, fractionDigits = 0, currency?: string) {
  if (currency) {
    const options = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).resolvedOptions()

    const finalFractionDigits = fractionDigits > 0 ? fractionDigits : options.minimumFractionDigits

    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: finalFractionDigits,
      maximumFractionDigits: finalFractionDigits,
    })

    return `${formatter.format(amount)} ${currency}`
  }

  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })

  return formatter.format(amount)
}

// Compact number format (10K, 10M etc.)
export function compactNum(amount: number) {
  const formatted = new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
    }).format(amount)

  return formatted
}

// Calculate Sharpe ratio
export function calculateSharpeRatio(monthlyReturns: number[], annualRiskFreeRate: number): number {
  const n = monthlyReturns.length
  if (n === 0) {
    return 0
  }

  const meanReturn = monthlyReturns.reduce((acc, val) => acc + val, 0) / n
  const monthlyRiskFreeRate = Math.pow(1 + annualRiskFreeRate, 1 / 12) - 1

  // Population standard deviation of the monthly returns (like Excel's STDEVP)
  const variance = monthlyReturns.reduce((acc, val) => acc + Math.pow(val - meanReturn, 2), 0) / n
  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) {
    return 0
  }

  // Calculate the Sharpe Ratio and annualize it
  const sharpeRatio = (meanReturn - monthlyRiskFreeRate) / stdDev
  return sharpeRatio * Math.sqrt(12)
}

// Format number with commas for display
export function formatNumberWithCommas(value: string | number): string {
  if (value === "" || value === null || value === undefined) {
    return ""
  }
  const num = typeof value === "string" ? value.replace(/,/g, "") : value.toString()
  if (isNaN(parseFloat(num))) {
    return ""
  }
  const parts = num.split(".")
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return parts.join(".")
}

// Parse formatted number back to a raw number string
export function parseFormattedNumber(value: string): string {
  return value.replace(/,/g, "")
}

// Check trading hours
export function isTradingHours() {
  const now = new Date()
  const utcOffset = now.getTimezoneOffset() * 60 * 1000 // Offset in milliseconds
  const utc7Offset = 7 * 60 * 60 * 1000 // UTC+7 offset in milliseconds
  const nowUtc7 = new Date(now.getTime() + utcOffset + utc7Offset)

  const day = nowUtc7.getDay() // Sunday - 0, Monday - 1, ..., Saturday - 6
  const hours = nowUtc7.getHours()
  const minutes = nowUtc7.getMinutes()

  // Check if it's a weekday (Monday to Friday)
  const isWeekday = day >= 1 && day <= 5

  // Check if time is between 9:15 AM and 2:45 PM (14:45)
  const isWithinTradingTime =
    (hours > 9 || (hours === 9 && minutes >= 15)) &&
    (hours < 14 || (hours === 14 && minutes <= 45))

  return isWeekday && isWithinTradingTime
}