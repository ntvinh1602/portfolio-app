"use client"

import * as React from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronRight, Calendar1 } from "lucide-react"
import { Calendar } from "./ui/calendar"

type DateRangeProps = {
  dateFrom: Date | undefined
  dateTo: Date | undefined
  onDateFromChange: (date: Date | undefined) => void
  onDateToChange: (date: Date | undefined) => void
}

function DateRange({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: DateRangeProps) {
  const [openFrom, setOpenFrom] = React.useState(false)
  const [openTo, setOpenTo] = React.useState(false)

  return (
    <div className="flex items-center">
      <Calendar1 className="stroke-1 size-4 h-9 border-b" />
      <Popover open={openFrom} onOpenChange={setOpenFrom}>
        <PopoverTrigger asChild>
          <Button variant="underline" className="flex-1 px-3" id="dates">
            {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Select date"}
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
              onDateFromChange(date)
              setOpenFrom(false)
            }}
          />
        </PopoverContent>
      </Popover>
      <ChevronRight className="stroke-1 size-4 h-9 border-b" />
      <Popover open={openTo} onOpenChange={setOpenTo}>
        <PopoverTrigger asChild>
          <Button variant="underline" className="flex-1 px-3" id="dates">
            {dateTo ? format(dateTo, "dd/MM/yyyy") : "Select date"}
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
              onDateToChange(date)
              setOpenTo(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function SingleDate({
  selected,
  onSelect,
  dateFormat = "dd/MM/yyyy"
}: {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  dateFormat?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="flex items-center">
      <Calendar1 className="stroke-1 size-4 h-9 border-b" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="underline" className="flex-1 px-2" id="dates">
            {selected ? format(selected, dateFormat) : "Select date"}
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
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              onSelect(date)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { DateRange, SingleDate }