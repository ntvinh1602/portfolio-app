import { format } from "date-fns"
import { Plane } from "lucide-react"
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemSeparator,
} from "@/components/ui/item"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import type { Database } from "@/types/database.types"
import { FlightDetail } from "../../config"

type FlightList = Database["flight"]["Views"]["flights_readable"]["Row"]
export type Flight = {
  [K in keyof FlightList]: NonNullable<FlightList[K]>
}

export function FlightItem({ flight }: { flight: Flight }) {
  const details = FlightDetail.map((item) => ({
    ...item,
    value: item.getValue(flight),
  }))

  return (
    <Item variant="outline">
      <ItemMedia variant="image" className="hidden sm:block">
        <Image
          src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/logo/airline/${flight.airline_logo}`}
          alt=""
          width={44}
          height={44}
          unoptimized
        />
      </ItemMedia>
      <ItemSeparator orientation="vertical" className="hidden sm:block" />
      <ItemContent>
        <div className="flex gap-2">
          <Badge variant="secondary">{flight.departure_airport_code}</Badge>
          <ItemTitle className="hidden sm:block">
            {flight.departure_airport_name}
          </ItemTitle>
        </div>
        <ItemDescription>
          {format(new Date(flight.departure_time), "dd MMM yyyy, HH:mm")}
        </ItemDescription>
      </ItemContent>
      <ItemMedia className="flex-col">
        <Plane className="size-4 rotate-45 text-muted-foreground" />
        <ItemDescription className="text-xs">
          {flight.flight_number}
        </ItemDescription>
      </ItemMedia>
      <ItemContent className="items-end">
        <div className="flex gap-2">
          <ItemTitle className="hidden sm:block">
            {flight.arrival_airport_name}
          </ItemTitle>
          <Badge variant="secondary">{flight.arrival_airport_code}</Badge>
        </div>
        <ItemDescription>
          {format(new Date(flight.arrival_time), "dd MMM yyyy, HH:mm")}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}
