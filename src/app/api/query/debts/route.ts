import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("debts")
        .select("*")
        .eq("status", "active")

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 's-maxage=31536000, stale-while-revalidate=59' } })
  } catch (error) {
    console.error("Error fetching debts:", error)
    return NextResponse.json(
      { error: "Failed to fetch debts" },
      { status: 500 }
    )
  }
}