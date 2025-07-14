import { createClient } from "@/lib/supabase/supabaseServer"
import { unstable_cache } from "next/cache"
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
    const getAssetSummary = unstable_cache(
      async () => {
        const { data, error } = await supabase.rpc("get_asset_summary")

        if (error) {
          console.error("Error calling get_asset_summary function:", error)
          throw new Error("Internal Server Error")
        }
        return data
      },
      [`asset-summary-${user.id}`],
      {
        revalidate: 3600, // 1 hour
        tags: [`asset-summary`, `asset-summary-${user.id}`],
      },
    )

    const data = await getAssetSummary()

    return NextResponse.json(data)
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}