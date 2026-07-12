import type { Database } from "@/types/database.types"
import {
  Leaf,
  BriefcaseBusiness,
  Users,
  Plane,
  Clock,
  Armchair,
  Star,
  Hash,
} from "lucide-react"

type FlightList = Database["flight"]["Views"]["flights_summary"]["Row"]
export type Flight = {
  [K in keyof FlightList]: NonNullable<FlightList[K]>
}

export const ticketClass = [
  { key: "eco", label: "Economy", icon: Leaf },
  { key: "biz", label: "Business", icon: BriefcaseBusiness },
]

export const FlightDetail = [
  { key: "tail", icon: Hash, getValue: (f: Flight) => f.tail_number },
  { key: "airline", icon: Users, getValue: (f: Flight) => f.airline_name },
  { key: "aircraft", icon: Plane, getValue: (f: Flight) => f.aircraft_type },
  { key: "duration", icon: Clock, getValue: (f: Flight) => f.duration },
  {
    key: "seat",
    icon: Armchair,
    getValue: (f: Flight) => `${f.seat_number} - ${f.seat_position}`,
  },
  {
    key: "class",
    icon: Star,
    getValue: (f: Flight) =>
      ticketClass.find((s) => s.key === f.ticket_class)?.label ?? null,
  },
] as const
