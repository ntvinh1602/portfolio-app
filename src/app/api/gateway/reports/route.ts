import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
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
    
    const [
      stockPnLResponse,
      yearlyResponse,
      monthlyResponse
    ] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/stock_annual_pnl?select=*`, fetchSupabaseOptions),
      fetch(`${supabaseUrl}/rest/v1/yearly_snapshots?select=*`, fetchSupabaseOptions),
      fetch(`${supabaseUrl}/rest/v1/monthly_snapshots?select=*`, fetchSupabaseOptions),
    ])

    for (const response of [
      stockPnLResponse,
      yearlyResponse,
      monthlyResponse,
    ]) {
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }
    }

    const [
      stockPnLData,
      yearlyData,
      monthlyData
    ] = await Promise.all([
      stockPnLResponse.json(),
      yearlyResponse.json(),
      monthlyResponse.json(),
    ])
    
    return NextResponse.json({
      stockPnLData,
      yearlyData,
      monthlyData
    })
  } catch (error) {
    console.error("Supabase Data API Gateway Error:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
