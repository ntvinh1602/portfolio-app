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

export async function getNews() {
  const baseUrl = await getBaseUrl()

  const res = await fetch(`${baseUrl}/api/news`, 
    process.env.NODE_ENV === "development"
      ? { cache: "no-store" }
      : {
          next: {
            tags: ["news"],
            revalidate: 86400,
          },
        }
  )

  if (!res.ok) {
    throw new Error("Failed to fetch news")
  }

  return res.json()
}