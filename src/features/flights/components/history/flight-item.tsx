import { format } from "date-fns"
import { Plane, EllipsisVertical, SquarePen, Trash2 } from "lucide-react"
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemFooter,
} from "@/components/ui/item"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
      <ItemContent>
        <ItemTitle>{flight.departure_airport_code}</ItemTitle>
        <ItemDescription className="hidden sm:block">
          {flight.departure_airport_name}
        </ItemDescription>
        <ItemDescription>
          {format(new Date(flight.departure_time), "HH:mm, dd MMM yyyy")}
        </ItemDescription>
      </ItemContent>
      <ItemMedia className="flex-col">
        <Plane className="size-4 rotate-45" />
        <span className="text-xs font-medium">{flight.tail_number}</span>
        <span className="text-xs font-medium">{flight.duration}</span>
      </ItemMedia>
      <ItemContent className="items-end">
        <ItemTitle>{flight.arrival_airport_code}</ItemTitle>
        <ItemDescription className="hidden sm:block">
          {flight.arrival_airport_name}
        </ItemDescription>
        <ItemDescription>
          {format(new Date(flight.arrival_time), "HH:mm, dd MMM yyyy")}
        </ItemDescription>
      </ItemContent>

      <ItemFooter className="bg-muted/50 px-3 py-2 rounded-2xl">
        <ItemMedia variant="image" className="hidden sm:block">
          <Image
            src={`${process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL}/logo-img/${flight.airline_logo}`}
            alt=""
            width={44}
            height={44}
            unoptimized
          />
        </ItemMedia>

        <ItemContent className="grid grid-cols-2 md:grid-cols-3 items-center gap-2">
          {details.map(({ key, icon: Icon, value }) => (
            <Badge
              key={key}
              variant="ghost"
              className="pointer-events-none capitalize"
            >
              <Icon />
              {value}
            </Badge>
          ))}
        </ItemContent>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-lg" variant="ghost">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <SquarePen />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemFooter>
    </Item>
  )
}
