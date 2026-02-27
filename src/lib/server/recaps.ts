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

export async function getRecaps() {
  const baseUrl = await getBaseUrl()

  const res = await fetch(`${baseUrl}/api/recaps`, {
    next: {
      tags: ["recaps", "analytics"],
      revalidate: 86400,
    },
  })

  if (!res.ok) {
    throw new Error("Failed to fetch annual recaps")
  }

  return res.json()
}