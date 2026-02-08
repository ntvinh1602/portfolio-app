import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if ( !supabaseUrl || !serviceRoleKey) {
      throw new Error("Server misconfigured: missing one or more environment variables")
    }

    const fetchSupabaseOptions = {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      },
      next: { revalidate: 600, tags: ["reports"] }
    }
    
    const [stockPnLResponse, yearlyResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/stock_annual_pnl?select=*`, fetchSupabaseOptions),
      fetch(`${supabaseUrl}/rest/v1/yearly_snapshots?select=*`, fetchSupabaseOptions),
    ])

    for (const response of [
      stockPnLResponse,
      yearlyResponse,
    ]) {
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }
    }

    const [
      stockPnLData,
      yearlyData,
    ] = await Promise.all([
      stockPnLResponse.json(),
      yearlyResponse.json(),
    ])
    
    return NextResponse.json({
      stockPnLData,
      yearlyData,
    })
  } catch (error) {
    console.error("Supabase Data API Gateway Error:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
