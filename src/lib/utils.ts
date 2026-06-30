import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Cached Intl.NumberFormat instances ---
// Creating Intl.NumberFormat is expensive — cache by config key to avoid
// re-instantiating on every call (these are called on every render tick).

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
})
const percentageFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const numberFormatters = [
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }),
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
]

// Format number based decimal places
export function formatNum(amount: number, fractionDigits: 0 | 1 | 2 = 0) {
  return numberFormatters[fractionDigits].format(amount)
}

// Compact number format (10K, 10M etc.)
export function compactNum(amount: number) {
  return compactFormatter.format(amount)
}

// Percentage number format
export function pctNum(amount: number) {
  return percentageFormatter.format(amount)
}
