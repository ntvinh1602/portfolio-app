import DashboardClient from "./client"
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

async function getDashboard() {
  const baseUrl = await getBaseUrl()

  const res = await fetch(`${baseUrl}/api/dashboard`, {
    next: {
      tags: ["dashboard"],
      revalidate: 1800, // optional TTL fallback
    },
  })

  if (!res.ok) {
    throw new Error("Failed to fetch dashboard")
  }

  return res.json()
}

async function getNews() {
  const baseUrl = await getBaseUrl()

  const res = await fetch(`${baseUrl}/api/news`, {
    next: {
      tags: ["news"],
      revalidate: 900,
    },
  })

  if (!res.ok) {
    throw new Error("Failed to fetch news")
  }

  return res.json()
}

export default async function Page() {
  const [dashboard, news] = await Promise.all([
    getDashboard(),
    getNews(),
  ])

  return (
    <DashboardClient
      data={dashboard}
      news={news}
    />
  )
}