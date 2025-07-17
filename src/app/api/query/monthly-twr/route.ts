import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"
import { unstable_cache } from "next/cache"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")

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

    const getMonthlyTwr = unstable_cache(
      async () => {
        const { data, error } = await supabase.rpc("get_monthly_twr", {
          p_user_id: user.id,
          p_start_date: startDate,
          p_end_date: endDate,
        })

        if (error) {
          console.error("Error fetching monthly TWR:", error)
          throw new Error("Could not fetch monthly TWR data.")
        }

        return data.map((item: { month: string }) => ({
          ...item,
          month: item.month,
        }))
      },
      [`monthly-twr-${user.id}-${startDate}-${endDate}`],
      {
        revalidate: 3600, // 1 hour
        tags: [`monthly-twr`, `monthly-twr-${user.id}`],
      },
    )

    const formattedData = await getMonthlyTwr()

    return NextResponse.json(formattedData)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}