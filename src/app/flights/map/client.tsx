"use client"

import "leaflet/dist/leaflet.css"
import dynamic from "next/dynamic"
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
import type { RoutesGeoJSONProperties } from "@/lib/server/flights-routes"
import type { Airport } from "@/lib/server/flights-airports"
import type { FeatureCollection, LineString } from "geojson"
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

type RoutesGeoJSON = FeatureCollection<LineString, RoutesGeoJSONProperties>

type Props = {
  stats: LifetimeStats
  routes: RoutesGeoJSON
  airports: Airport[]
}

export default function FlightsMapClient({ stats, routes, airports }: Props) {
  const statItems = [
    {
      title: "Flights",
      figure: stats.flights_count,
      icon: TicketsPlane,
    },
    {
      title: "Total Distance",
      figure: `${formatNum(Math.round(stats.total_distance ?? 0))} km`,
      icon: Route,
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
      title: "Total Duration",
      figure: stats.total_duration,
      icon: Clock,
    },
  ]

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
              className="sm:basis-1/2 md:basis-1/3 xl:basis-1/4 2xl:basis-1/5"
            >
              <Item variant="outline">
                <ItemMedia variant="icon">
                  <stat.icon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-2xl">
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
