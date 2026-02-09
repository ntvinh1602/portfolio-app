import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface SamplingParams {
  p_threshold: number
  p_start_date?: string
  p_end_date?: string
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Server misconfigured: missing one or more environment variables")
    }

    const searchParams = request.nextUrl.searchParams
    const time = searchParams.get("time")
    const threshold = 150

    if (!time) {
      return NextResponse.json({ error: "Missing time parameter" }, { status: 400 })
    }

    const now = new Date()
    let p_start_date: string | null = null
    let p_end_date: string | null = null

    // Handle year-based vs rolling timeframe
    if (/^\d{4}$/.test(time)) {
      const year = parseInt(time, 10)
      p_start_date = `${year}-01-01`
      p_end_date = `${year}-12-31`
    } else {
      switch (time) {
        case "all":
          p_start_date = "2021-11-01"
          p_end_date = now.toISOString().slice(0, 10)
          break
        case "1y": {
          const start = new Date(now)
          start.setFullYear(start.getFullYear() - 1)
          p_start_date = start.toISOString().slice(0, 10)
          p_end_date = now.toISOString().slice(0, 10)
          break
        }
        case "6m": {
          const start = new Date(now)
          start.setMonth(start.getMonth() - 6)
          p_start_date = start.toISOString().slice(0, 10)
          p_end_date = now.toISOString().slice(0, 10)
          break
        }
        case "3m": {
          const start = new Date(now)
          start.setMonth(start.getMonth() - 3)
          p_start_date = start.toISOString().slice(0, 10)
          p_end_date = now.toISOString().slice(0, 10)
          break
        }
      }
    }

    const body: SamplingParams = { p_threshold: threshold }
    if (p_start_date && p_end_date) {
      body.p_start_date = p_start_date
      body.p_end_date = p_end_date
    }

    const fetchSupabaseOptions: RequestInit & { next?: { revalidate: number; tags: string[] } } = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
      next: {
        revalidate: 600,
        tags: ["annual-chart"],
      },
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sampling_equity_data`, fetchSupabaseOptions)

    if (!response.ok) {
      const errorResult = await response.json().catch(() => null)
      const errorMsg = errorResult?.error || `Supabase RPC failed with ${response.status}`
      return NextResponse.json({ error: errorMsg }, { status: response.status })
    }

    const result = await response.json()
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("Supabase RPC API Error:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
