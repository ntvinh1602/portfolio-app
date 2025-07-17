import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"
import { unstable_cache } from "next/cache"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")

  console.log(
    `'/api/query/monthly-pnl' called with: start_date=${startDate}, end_date=${endDate}`,
  )
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "start_date and end_date are required" },
      { status: 400 },
    )
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const getMonthlyPnl = unstable_cache(
      async () => {
        const { data, error } = await supabase.rpc("get_monthly_pnl", {
          p_user_id: user.id,
          p_start_date: startDate,
          p_end_date: endDate,
        })

        if (error) {
          console.error("Error fetching monthly PnL:", error)
          throw new Error("Could not fetch monthly PnL data.")
        }

        return data.map((item: { month: string }) => ({
          ...item,
          month: item.month,
        }))
      },
      [`monthly-pnl-${user.id}-${startDate}-${endDate}`],
      {
        revalidate: 3600, // 1 hour
        tags: [`monthly-pnl`, `monthly-pnl-${user.id}`],
      },
    )

    const formattedData = await getMonthlyPnl()

    return NextResponse.json(formattedData)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}