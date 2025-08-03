import {
  format,
  subDays,
  subMonths,
  startOfMonth,
  startOfYear
} from "date-fns"

const lifetime = '2021-11-09' // First snapshot date
const last90D = format(subDays(new Date(), 90), "yyyy-MM-dd")
const last12M = format(startOfMonth(subMonths(new Date(), 11)), "yyyy-MM-dd")
const thisMonth = format(startOfMonth(new Date()), "yyyy-MM-dd")
const thisYear = format(startOfYear(new Date()), "yyyy-MM-dd")

export {
  lifetime,
  last90D,
  last12M,
  thisMonth,
  thisYear
}