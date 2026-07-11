import { formatNum } from "@/lib/utils"
import {
  Clock,
  Earth,
  Plane,
  PlaneTakeoff,
  Route,
  TicketsPlane,
} from "lucide-react"
import type { LifetimeStats } from "@flight/actions/get-lifetime-stats"
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

export default function StatsCarousel({ stats }: { stats: LifetimeStats }) {
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
      title: "Aircraft Types",
      figure: stats.airframe_count,
      icon: Plane,
    },
    {
      title: "Distance",
      figure: `${formatNum(stats.total_distance)} km`,
      icon: Route,
    },
    {
      title: "Duration",
      figure: stats.total_duration,
      icon: Clock,
    },
  ]

  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
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
  )
}
