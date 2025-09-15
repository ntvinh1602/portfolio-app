import { createClient } from "@/lib/supabase/supabaseServer"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error("API Route: Unauthorized access attempt.")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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