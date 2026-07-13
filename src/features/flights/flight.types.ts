import type { Database } from "@/types/database.types"

export interface FilterState {
  year: string | null // "all" or a year string like "2024"
  airline: string | null // "all" or an airline name
  ticketClass: Database["flight"]["Enums"]["ticket_class"] // selected seat type value
  search: string // flight number search
}

