import { updateTag } from "next/cache"
import { NextResponse } from "next/server"

const ALLOWED_TAGS = new Set([
  "analytics",
  "flights",
  "news",
])

export async function POST(req: Request) {
  const secret = req.headers.get("x-update-secret")

  if (secret !== process.env.APP_SECRET) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    )
  }

  let body: { tags?: string[] }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const tags = body.tags

  if (!Array.isArray(tags) || tags.length === 0) {
    return NextResponse.json(
      { message: "No tags provided" },
      { status: 400 }
    )
  }

  const validTags = tags.filter(tag => ALLOWED_TAGS.has(tag))

  if (validTags.length === 0) {
    return NextResponse.json(
      { message: "No valid tags" },
      { status: 400 }
    )
  }

  for (const tag of validTags) {
    updateTag(tag)
  }

  return NextResponse.json({
    updated: true,
    tags: validTags,
    now: Date.now(),
  })
}