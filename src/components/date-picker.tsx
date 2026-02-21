"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronRight } from "lucide-react"
import { Calendar } from "./ui/calendar"

type DatePickerProps = {
  dateFrom: Date
  dateTo: Date
  onDateFromChange: (date: Date) => void
  onDateToChange: (date: Date) => void
}

export function DatePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: DatePickerProps) {
  const [openFrom, setOpenFrom] = useState(false)
  const [openTo, setOpenTo] = useState(false)

  return (
    <div className="flex items-center">
      <Popover open={openFrom} onOpenChange={setOpenFrom}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 px-3" id="dates">
            {dateFrom ? format(dateFrom, "dd MMM yyyy") : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="bg-card/25 backdrop-blur-sm w-auto overflow-hidden p-0"
          align="start"
        >
          <Calendar
            mode="single"
            captionLayout="dropdown"
            weekStartsOn={1}
            selected={dateFrom}
            defaultMonth={dateFrom}
            onSelect={(date) => {
              if (!date) return // prevent passing undefined
              onDateFromChange(date)
              setOpenFrom(false)
            }}
          />
        </PopoverContent>
      </Popover>
      <ChevronRight className="size-4"/>
      <Popover open={openTo} onOpenChange={setOpenTo}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 px-3" id="dates">
            {dateTo ? format(dateTo, "dd MMM yyyy") : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="bg-card/25 backdrop-blur-sm w-auto overflow-hidden p-0"
          align="start"
        >
          <Calendar
            mode="single"
            captionLayout="dropdown"
            weekStartsOn={1}
            selected={dateTo}
            defaultMonth={dateTo}
            onSelect={(date) => {
              if (!date) return // prevent passing undefined
              onDateToChange(date)
              setOpenFrom(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}