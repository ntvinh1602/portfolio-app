import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { format, subMonths, startOfMonth } from "date-fns"
import { inceptionDate } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"

type MonthlyExpense = {
  month: string
  trading_fees: number
  taxes: number
  interest: number
}

export function useExpensesData() {
  const { userId } = useAuth()

  // Fetch last 12 months of expenses for the bar chart
  const monthlyStartDate = startOfMonth(subMonths(new Date(), 11))
  const monthlyParams = new URLSearchParams({
    start: format(monthlyStartDate, "yyyy-MM-dd")
  })

  const {
    data: monthlyExpenses,
    error: monthlyError,
    isLoading: monthlyLoading,
  } = useSWR<MonthlyExpense[]>(
    userId
      ? `/api/gateway/${userId}/expenses?${monthlyParams.toString()}`
      : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  // Fetch all expenses for the pie chart structure
  const allTimeParams = new URLSearchParams({
    start: inceptionDate
  })

  const { data: allExpenses, isLoading: structureLoading } =
    useSWR<MonthlyExpense[]>(
      userId
        ? `/api/gateway/${userId}/expenses?${allTimeParams.toString()}`
        : null,
      fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
    )

  const expenseStructure = allExpenses
    ? Object.entries(
        allExpenses.reduce(
          (acc, curr) => {
            acc.trading_fees += curr.trading_fees
            acc.taxes += curr.taxes
            acc.interest += curr.interest
            return acc
          },
          { trading_fees: 0, taxes: 0, interest: 0 }
        )
      ).map(([key, value]) => ({
        category: key
          .replace("_", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        total_amount: value,
      }))
    : []

  return {
    monthlyExpenses: monthlyExpenses ?? [],
    monthlyError,
    monthlyLoading,
    expenseStructure,
    structureLoading,
  }
}