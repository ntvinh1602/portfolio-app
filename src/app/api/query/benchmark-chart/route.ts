import { createClient } from "@/lib/supabase/supabaseServer"
import { unstable_cache } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const start_date = searchParams.get("start_date")
  const end_date = searchParams.get("end_date")
  const threshold = searchParams.get("threshold")

  if (!start_date || !end_date || !threshold) {
    return NextResponse.json(
      { error: "start_date, end_date and threshold are required" },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const getBenchmarkChartData = unstable_cache(
      async () => {
        const { data, error } = await supabase.rpc("get_benchmark_chart_data", {
          p_user_id: user.id,
          p_start_date: start_date,
          p_end_date: end_date,
          p_threshold: parseInt(threshold),
        })

        if (error) {
          console.error(
            "Error calling get_benchmark_chart_data function:",
            error,
          )
          throw new Error("Internal Server Error")
        }
        return data
      },
      [`benchmark-chart-${user.id}-${start_date}-${end_date}-${threshold}`],
      {
        revalidate: 3600, // 1 hour
        tags: [`benchmark-chart`, `benchmark-chart-${user.id}`],
      },
    )
    const data = await getBenchmarkChartData()

    return NextResponse.json(data)
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}