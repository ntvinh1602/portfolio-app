import { createClient } from "@/lib/supabase/supabaseServer"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {

  try {
    // Check Authorization header
    const authHeader = req.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.MY_APP_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Supabase client
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("monthly_snapshots")
      .select()

    if (error) {
      console.error("Error fetching monthly_snapshots:", error)
      throw new Error("Internal Server Error")
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}