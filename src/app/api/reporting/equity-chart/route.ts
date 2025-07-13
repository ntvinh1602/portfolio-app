import { createClient } from "@/lib/supabase/middleware"
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

  const { supabase } = createClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase.rpc('get_equity_chart_data', {
      p_user_id: user.id,
      p_start_date: start_date,
      p_end_date: end_date,
      p_threshold: parseInt(threshold),
    })

    if (error) {
      console.error('Error calling get_equity_chart_data function:', error)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}