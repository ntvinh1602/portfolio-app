import Link from 'next/link'
import { Clock, MapIcon } from 'lucide-react'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const pages = [
  {
    href: '/flights/map',
    icon: MapIcon,
    title: 'Map',
    description: 'Interactive flight route map',
    body: 'Explore your flight routes on an interactive world map with route frequency heatmaps and airport markers.',
  },
  {
    href: '/flights/history',
    icon: Clock,
    title: 'History',
    description: 'Flight history and log',
    body: 'Browse, filter, and search past flights. Add new flights with detailed departure, arrival, airline, and seat info.',
  },
]

export default function FlightsPage() {
  return (
    <div className="@container/main flex flex-1 flex-col pb-4">
      <div className="grid grid-cols-1 gap-4 px-4 mx-auto">
        {pages.map((page) => (
          <Link key={page.href} href={page.href}>
            <Card className="h-full transition-colors hover:bg-accent max-w-120">
              <CardHeader>
                <CardAction>
                  <page.icon className="stroke-1" />
                </CardAction>
                <CardTitle>{page.title}</CardTitle>
                <CardDescription>{page.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{page.body}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
