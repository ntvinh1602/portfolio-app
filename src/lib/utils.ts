import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format number based on currency and decimal places
export function formatNum(amount: number, fractionDigits = 0, currency?: string) {
  if (currency) {
    const options = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).resolvedOptions()

    const finalFractionDigits = fractionDigits > 0
      ? fractionDigits
      : options.minimumFractionDigits

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
