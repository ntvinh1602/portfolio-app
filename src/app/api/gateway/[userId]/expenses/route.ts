import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: requestedUserId } = await params
    const { searchParams } = new URL(request.url)
    const { headers } = request
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (user.id !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const baseUrl = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        revalidate: 600,
        tags: [`txn-driven-${requestedUserId}`],
      },
    }

    const response = await fetch(
      `${baseUrl}/api/query/${requestedUserId}/monthly-expenses?start_date=${startDate}&end_date=${endDate}`,
      fetchOptions
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `Error fetching expenses data: ${response.url} - ${response.status} ${response.statusText}`,
        errorText
      )
      throw new Error(`Failed to fetch from ${response.url}`)
    }

    const data = await response.json()

    return NextResponse.json(data)
    
  } catch (error) {
    console.error("Error fetching expenses data:", error)
    return NextResponse.json(
      { error: "Failed to fetch expenses data" },
      { status: 500 }
    )
  }
}