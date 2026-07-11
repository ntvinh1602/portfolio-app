"use client"

import { useCallback } from "react"
import { format } from "date-fns"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import {
  Leaf,
  BriefcaseBusiness,
  Users,
  Armchair,
  Star,
  Clock,
  Hash,
  ChevronRight,
  Plane,
  Calendar,
} from "lucide-react"
import { useFlightItem } from "./flight-item-context"

type FlightList = Database["flight"]["Views"]["flights_readable"]["Row"]
export type Flight = {
  [K in keyof FlightList]: NonNullable<FlightList[K]>
}
export const seatType = [
  { key: "eco", label: "Economy", icon: Leaf },
  { key: "biz", label: "Business", icon: BriefcaseBusiness },
] as const

const FlightDetail = [
  {
    key: "tail",
    icon: Hash,
    getValue: (f: Flight) => f.tail_number,
  },
  {
    key: "airline",
    icon: Users,
    getValue: (f: Flight) => f.airline_name,
  },
  {
    key: "aircraft",
    icon: Plane,
    getValue: (f: Flight) => f.aircraft_model,
  },
  {
    key: "duration",
    icon: Clock,
    getValue: (f: Flight) => f.duration,
  },
  {
    key: "seat",
    icon: Armchair,
    getValue: (f: Flight) => `${f.seat} - ${f.seat_position}`,
  },
  {
    key: "class",
    icon: Star,
    getValue: (f: Flight) =>
      seatType.find((s) => s.key === f.seat_type)?.label ?? null,
  },
] as const

export function FlightItem({
  flight,
  index,
}: {
  flight: Flight
  index: number
}) {
  const { state, actions } = useFlightItem()
  const itemKey = `${flight.flight_number}-${flight.departure_time}-${index}`
  const open = state.openKey === itemKey
  const setOpen = useCallback(
    (v: boolean) => actions.setOpenKey(v ? itemKey : null),
    [actions, itemKey],
  )

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
              <Badge variant="secondary" className="hidden sm:block">
                {flight.departure_airport_code}
              </Badge>
              <ItemTitle>{flight.departure_airport_name}</ItemTitle>
            </div>
            <ItemDescription className="-ml-2">
              <Badge variant="ghost" className="pointer-events-none">
                <Calendar />
                {format(new Date(flight.departure_time), "yyyy-MM-dd")}
              </Badge>
              <Badge variant="ghost" className="pointer-events-none">
                <Clock />
                {format(new Date(flight.departure_time), "HH:mm")}
              </Badge>
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
              <ItemTitle>{flight.arrival_airport_name}</ItemTitle>
              <Badge variant="secondary" className="hidden sm:block">
                {flight.arrival_airport_code}
              </Badge>
            </div>
            <ItemDescription className="-mr-2">
              <Badge variant="ghost" className="pointer-events-none">
                <Calendar />
                {format(new Date(flight.arrival_time), "yyyy-MM-dd")}
              </Badge>
              <Badge variant="ghost" className="pointer-events-none">
                <Clock />
                {format(new Date(flight.arrival_time), "HH:mm")}
              </Badge>
            </ItemDescription>
          </ItemContent>
          <ItemSeparator orientation="vertical" className="hidden sm:block" />
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-90",
            )}
          />
        </Item>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 md:px-4">
        <ItemGroup className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-0 p-2">
          {FlightDetail.map((detail) => {
            const value = detail.getValue(flight)
            if (!value) return null

            return (
              <Item key={detail.key} size="xs" className="p-1">
                <ItemMedia variant="icon" className="text-muted-foreground">
                  <detail.icon />
                </ItemMedia>
                <ItemContent>
                  <ItemDescription className="capitalize">
                    {value}
                  </ItemDescription>
                </ItemContent>
              </Item>
            )
          })}
        </ItemGroup>
      </CollapsibleContent>
    </Collapsible>
  )
}
