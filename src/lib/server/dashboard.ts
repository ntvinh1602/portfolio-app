import { headers } from "next/headers"

async function getBaseUrl() {
  const h = await headers()
  const host = h.get("host")!
  const protocol =
    process.env.NODE_ENV === "development"
      ? "http"
      : "https"

  return `${protocol}://${host}`
}

export async function getDashboard() {
  const baseUrl = await getBaseUrl()

  const res = await fetch(`${baseUrl}/api/dashboard`, {
    next: {
      tags: ["dashboard", "analytics"],
      revalidate: 86400,
    },
  })

  if (!res.ok) {
    throw new Error("Failed to fetch dashboard")
  }

  return res.json()
}