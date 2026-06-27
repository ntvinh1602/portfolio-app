export interface FilterState {
  year: string | null // "all" or a year string like "2024"
  airline: string | null // "all" or an airline name
  seatTypes: string[] // selected seat type values
  search: string // flight number search
}