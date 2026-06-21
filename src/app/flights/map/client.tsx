"use client"

import "leaflet/dist/leaflet.css"
import dynamic from "next/dynamic"
import { useRoutesGeoJSON } from "@/hooks/useFlightRoutes"
import { useAirports } from "@/hooks/useAirports"
import { formatNum } from "@/lib/utils"
import {
  Clock,
  Earth,
  Plane,
  PlaneTakeoff,
  Route,
  TicketsPlane,
} from "lucide-react"
import type { LifetimeStats } from "@/lib/server/flights-stats"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"

const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false })

type Props = {
  stats: LifetimeStats
}

export default function FlightsMapClient({ stats }: Props) {
  const {
    data: routes,
    isLoading: loadingRoutes,
    error: routesError,
  } = useRoutesGeoJSON()

  const {
    data: airports,
    isLoading: loadingAirports,
    error: airportsError,
  } = useAirports()

  const statItems = [
    {
      title: "Flights",
      figure: stats.flights_count,
      icon: TicketsPlane,
    },
    {
      title: "Airports",
      figure: stats.airports_count,
      icon: PlaneTakeoff,
    },
    {
      title: "Countries",
      figure: stats.country_count,
      icon: Earth,
    },
    {
      title: "Airframes",
      figure: stats.airframe_count,
      icon: Plane,
    },
    {
      title: "Total Distance",
      figure: `${formatNum(Math.round(stats.total_distance ?? 0))} km`,
      icon: Route,
    },
    {
      title: "Total Duration",
      figure: stats.total_duration,
      icon: Clock,
    },
  ]

  if (loadingRoutes || loadingAirports) return <p>Loading flight data...</p>

  if (routesError || airportsError) return <p>Failed to load flight data.</p>

  return (
    <div className="flex flex-col h-full gap-4 px-4 pb-4">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 2000,
          }),
        ]}
      >
        <CarouselContent>
          {statItems.map((stat) => (
            <CarouselItem
              key={stat.title}
              className="basis-1/2 xl:basis-1/4 2xl:basis-1/6"
            >
              <Item variant="outline">
                <ItemMedia variant="icon">
                  <stat.icon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-xl xl:text-2xl">
                    {stat.figure}
                  </ItemTitle>
                  <ItemDescription>{stat.title}</ItemDescription>
                </ItemContent>
              </Item>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="relative h-full rounded-2xl overflow-hidden isolate">
        <LeafletMap routes={routes} airports={airports} />
      </div>
    </div>
  )
}
