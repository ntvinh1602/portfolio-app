import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { lifetime, last12M } from "@/lib/start-dates"

type MonthlyExpense = {
  month: string
  trading_fees: number
  taxes: number
  interest: number
}

export function useExpensesData() {

  // Fetch last 12 months expenses for the bar chart
  const {
    data: monthlyExpenses,
    isLoading: monthlyLoading,
  } = useSWR<MonthlyExpense[]>(
    `/api/gateway/expenses?start=${last12M}`,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  // Fetch lifetime expenses for the pie chart
  const {
    data: allExpenses,
    isLoading: structureLoading
  } = useSWR<MonthlyExpense[]>(
    `/api/gateway/expenses?start=${lifetime}`,
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
    monthlyLoading,
    expenseStructure,
    structureLoading,
  }
}