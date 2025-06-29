import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency?: string) {
  if (currency) {
    const options = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).resolvedOptions()

    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
    })

    return `${formatter.format(amount)} ${currency}`
  }

  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  })

  return formatter.format(amount)
}
