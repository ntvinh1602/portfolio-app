import { createClient } from "@/lib/supabase/supabaseServer"
import { unstable_cache } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const getFirstSnapshotDate = unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from("daily_performance_snapshots")
        .select("date")
        .order("date", { ascending: true })
        .limit(1)
        .single()

      if (error) {
        console.error("Error fetching first snapshot date:", error)
        throw new Error("Error fetching first snapshot date")
      }
      return data
    },
    [`first-snapshot-date`],
    {
      revalidate: 86400, // 24 hours
      tags: [`first-snapshot-date`],
    },
  )

  try {
    const data = await getFirstSnapshotDate()
    return NextResponse.json(data)
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}