import NewsClient from "./client"
import { getNews } from "@/lib/server/news"

export default async function Page() {
  const news = await getNews()
  return <NewsClient articles={news} />
}