import { createClient } from "@/lib/supabase/supabaseServer"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { data, error } = await supabase.rpc("get_asset_summary")

    if (error) {
      console.error("Error calling get_asset_summary function:", error)
      throw new Error("Internal Server Error")
    }
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=31536000, stale-while-revalidate=59",
      },
    })
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}