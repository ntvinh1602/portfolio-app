import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

type MonthlyExpense = {
  month: string;
  trading_fees: number;
  taxes: number;
  interest: number;
};

export function useExpensesData() {
  // Fetch last 12 months of expenses for the bar chart
  const monthlyEndDate = endOfMonth(new Date());
  const monthlyStartDate = startOfMonth(subMonths(new Date(), 11));
  const monthlyParams = new URLSearchParams({
    start_date: format(monthlyStartDate, "yyyy-MM-dd"),
    end_date: format(monthlyEndDate, "yyyy-MM-dd"),
  });

  const {
    data: monthlyExpenses,
    error: monthlyError,
    isLoading: monthlyLoading,
  } = useSWR<MonthlyExpense[]>(
    `/api/query/monthly-expenses?${monthlyParams.toString()}`,
    fetcher
  );

  // Fetch all expenses for the pie chart structure
  const { data: firstDateData } = useSWR<{ date: string }>(
    "/api/query/first-snapshot-date",
    fetcher
  );

  const allTimeParams = new URLSearchParams({
    start_date: firstDateData ? format(new Date(firstDateData.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(), "yyyy-MM-dd"),
  });

  const {
    data: allExpenses,
    isLoading: structureLoading,
  } = useSWR<MonthlyExpense[]>(
    firstDateData ? `/api/query/monthly-expenses?${allTimeParams.toString()}` : null,
    fetcher
  );

  const expenseStructure = allExpenses
    ? Object.entries(
        allExpenses.reduce(
          (acc, curr) => {
            acc.trading_fees += curr.trading_fees;
            acc.taxes += curr.taxes;
            acc.interest += curr.interest;
            return acc;
          },
          { trading_fees: 0, taxes: 0, interest: 0 }
        )
      ).map(([key, value]) => ({
        category: key.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
        total_amount: value,
      }))
    : [];

  return {
    monthlyExpenses: monthlyExpenses ?? [],
    monthlyError,
    monthlyLoading,
    expenseStructure,
    structureLoading: !firstDateData || structureLoading,
  };
}