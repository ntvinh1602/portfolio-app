import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    // --- Auth check ---
    const expectedSecret = process.env.REVALIDATION_TOKEN
    const secret = request.headers.get("x-secret-token")

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // --- Get tags from header ---
    const tagsHeader = request.headers.get("x-tags")
    if (!tagsHeader) {
      return NextResponse.json(
        { error: "Missing x-tags header" },
        { status: 400 }
      )
    }

    // --- Split and clean tags ---
    const tags = tagsHeader
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    if (tags.length === 0) {
      return NextResponse.json(
        { error: "No valid tags provided" },
        { status: 400 }
      )
    }

    // --- Revalidate each tag ---
    tags.forEach(tag => revalidateTag(tag))

    return NextResponse.json({
      revalidated: true,
      tags,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Error in revalidation webhook:", error)
    return NextResponse.json(
      { error: "Failed to revalidate" },
      { status: 500 }
    )
  }
}
