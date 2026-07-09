export interface FilterState {
  year: string | null // "all" or a year string like "2024"
  airline: string | null // "all" or an airline name
  seatType: string // selected seat type value
  search: string // flight number search
}