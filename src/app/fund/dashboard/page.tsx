import DashboardClient from "./client"
import { getNews } from "@/lib/server/news"
import { getDashboard } from "@/lib/server/dashboard"

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