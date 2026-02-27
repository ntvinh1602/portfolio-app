import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const secret = req.headers.get("x-revalidate-secret")

  if (secret !== process.env.VERCEL_CRON_SECRET) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    )
  }

  revalidateTag("dashboard", "max")
  revalidateTag("news", "max")

  return NextResponse.json({
    revalidated: true,
    now: Date.now(),
  })
}