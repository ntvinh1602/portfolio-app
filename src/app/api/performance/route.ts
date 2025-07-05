import { createClient } from "@/lib/supabase/middleware"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const start_date = searchParams.get("start_date")
  const end_date = searchParams.get("end_date")
  console.log('API Route: Received request with start_date:', start_date, 'and end_date:', end_date)

  if (!start_date || !end_date) {
    console.error('API Route: Missing start_date or end_date')
    return NextResponse.json(
      { error: "start_date and end_date are required" },
      { status: 400 },
    )
  }

  const { supabase } = createClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('API Route: Unauthorized access attempt.')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  console.log('API Route: User authenticated:', user.id)

  try {
    console.log('API Route: Calling calculate_twr with params:', {
      p_user_id: user.id,
      p_start_date: start_date,
      p_end_date: end_date,
    })
    const { data, error } = await supabase.rpc('calculate_twr', {
      p_user_id: user.id,
      p_start_date: start_date,
      p_end_date: end_date,
    })

    if (error) {
      console.error('Error calling calculate_twr function:', error)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }

    console.log('API Route: Successfully received data from calculate_twr:', data)
    return NextResponse.json({ twr: data })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}