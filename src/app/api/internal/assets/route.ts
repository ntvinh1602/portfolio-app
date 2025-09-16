import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"
import { Tables } from "@/types/database.types"

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

    // Fetch assets (non-user-specific)
    const { data, error } = await supabase
      .from("assets")
      .select()
      .not("asset_class", "in", "(equity,liability)")

    if (error) {
      console.error("Error fetching assets:", error)
      throw new Error("Internal Server Error")
    }

    return NextResponse.json(data as Tables<"assets">[])

  } catch (e) {
    console.error("Unexpected error fetching assets:", e)
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
