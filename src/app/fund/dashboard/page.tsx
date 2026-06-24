import Dashboard from "@fund/components/dashboard/wrapper"
import { Spinner } from "@/components/ui/spinner"
import getNews from "@/features/fund/actions/get-news"
import getDashboard from "@fund/actions/get-dashboard"
import { Suspense } from "react"

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <DashboardData />
    </Suspense>
  )
}

async function DashboardData() {
  const [dashboard, news] = await Promise.all([getDashboard(), getNews()])

  return <Dashboard data={dashboard} news={news} />
}
