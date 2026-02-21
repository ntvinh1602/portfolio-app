import {
  startOfDay,
  startOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  format
} from "date-fns"

/**
 * Returns start and end dates (in 'YYYY-MM-DD' format) based on a time range keyword or year string.
 * @param time - can be a year ("2024") or one of the following periods: "1m", "3m", "6m", "1y", "mtd", "ytd", "all"
 */
export function getDateRange(time: string) {
  const today = startOfDay(new Date())
  let startDate: Date
  let endDate: Date = today

  if (/^\d{4}$/.test(time)) {
    const year = parseInt(time, 10)
    startDate = startOfYear(new Date(year, 0, 1))
    endDate = endOfYear(new Date(year, 0, 1))
  } else {
    switch (time) {
      case "1m":
        startDate = subMonths(today, 1)
        break
      case "3m":
        startDate = subMonths(today, 3)
        break
      case "6m":
        startDate = subMonths(today, 6)
        break
      case "1y":
        startDate = subMonths(today, 12)
        break
      case "mtd":
        startDate = startOfMonth(today)
        break
      case "ytd":
        startDate = startOfYear(today)
        break
      case "all":
        startDate = new Date(2000, 0, 1)
        break
      default:
        throw new Error(`Invalid range: ${time}`)
    }
  }

  return {
    p_start_date: format(startDate, "yyyy-MM-dd"),
    p_end_date: format(endDate, "yyyy-MM-dd"),
  }
}
