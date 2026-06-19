import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Cached Intl.NumberFormat instances ---
// Creating Intl.NumberFormat is expensive — cache by config key to avoid
// re-instantiating on every call (these are called on every render tick).

const formatCache = new Map<string, Intl.NumberFormat>()
const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
})

function getFormatter(fractionDigits: number): Intl.NumberFormat {
  const key = `fd:${fractionDigits}`
  let fmt = formatCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
    formatCache.set(key, fmt)
  }
  return fmt
}

// Format number based on currency and decimal places
export function formatNum(amount: number, fractionDigits = 0, currency?: string) {
  if (currency) {
    const cacheKey = `cur:${currency}:${fractionDigits}`
    let currencyFmt = formatCache.get(cacheKey)
    if (!currencyFmt) {
      // Resolve the minimum fraction digits for this currency
      const resolvedFractionDigits = fractionDigits > 0
        ? fractionDigits
        : new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
          }).resolvedOptions().minimumFractionDigits

      currencyFmt = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: resolvedFractionDigits,
        maximumFractionDigits: resolvedFractionDigits,
      })
      formatCache.set(cacheKey, currencyFmt)
    }

    return `${currencyFmt.format(amount)} ${currency}`
  }

  return getFormatter(fractionDigits).format(amount)
}

// Compact number format (10K, 10M etc.)
export function compactNum(amount: number) {
  return compactFormatter.format(amount)
}
