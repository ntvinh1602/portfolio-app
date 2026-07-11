import { useState } from "react"
import { format } from "date-fns"
import { ChevronRight, Plane } from "lucide-react"
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemSeparator,
  ItemGroup,
} from "@/components/ui/item"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import type { Database } from "@/types/database.types"
import { FlightDetail } from "../../config"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

type FlightList = Database["flight"]["Views"]["flights_readable"]["Row"]
export type Flight = {
  [K in keyof FlightList]: NonNullable<FlightList[K]>
}

export function FlightItem({ flight }: { flight: Flight }) {
  const [open, setOpen] = useState(false)

  const details = FlightDetail.map((item) => ({
    ...item,
    value: item.getValue(flight),
  }))

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Item
          variant="outline"
          className="cursor-pointer transition-colors hover:bg-accent/50"
        >
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
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-90",
            )}
          />
        </Item>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 md:px-4">
        <ItemGroup className="grid grid-cols-2 md:grid-cols-3 gap-0 p-2 bg-muted/20 rounded-b-xl">
          {details.map(
            (detail) =>
              detail.value && (
                <Item key={detail.key} size="xs">
                  <ItemMedia variant="icon" className="text-muted-foreground">
                    <detail.icon />
                  </ItemMedia>
                  <ItemContent>
                    <ItemDescription className="capitalize">{detail.value}</ItemDescription>
                  </ItemContent>
                </Item>
              ),
          )}
        </ItemGroup>
      </CollapsibleContent>
    </Collapsible>
  )
}
