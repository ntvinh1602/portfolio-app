// app/api/dnse/auth/route.ts
import { NextResponse } from "next/server"

export async function GET() {
  const username = process.env.DNSE_USERNAME
  const password = process.env.DNSE_PASSWORD

  if (!username || !password) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 })
  }

  try {
    const res = await fetch("https://api.dnse.com.vn/user-service/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      next: {
        revalidate: 28800, // 8h = 28800 seconds
        tags: ["dnse-auth"], // optional tag to manually revalidate
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Auth failed" }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ token: data.token })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
