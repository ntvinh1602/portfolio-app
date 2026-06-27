"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "./ui/calendar"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  dateFrom: Date
  dateTo: Date
  onDateFromChange: (date: Date) => void
  onDateToChange: (date: Date) => void
  disabled?: boolean
}

function DatePopover({
  label,
  date,
  onDateChange,
  open,
  onOpenChange,
  disabled,
}: {
  label: string
  date: Date
  onDateChange: (date: Date) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled: boolean
}) {
  return (
    <>
      <span className={cn(disabled && "opacity-50 pointer-events-none")}>
        {label}
      </span>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            size="lg"
            id="dates"
            disabled={disabled}
          >
            {format(date, "dd MMM yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            weekStartsOn={1}
            selected={date}
            defaultMonth={date}
            onSelect={(d) => {
              if (!d) return
              onDateChange(d)
              onOpenChange(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}

export function DatePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  disabled = false,
}: DatePickerProps) {
  const [openFrom, setOpenFrom] = useState(false)
  const [openTo, setOpenTo] = useState(false)

  return (
    <div className="flex items-center w-full justify-between">
      <DatePopover
        label="From"
        date={dateFrom}
        onDateChange={onDateFromChange}
        open={openFrom}
        onOpenChange={setOpenFrom}
        disabled={disabled}
      />
      <DatePopover
        label="To"
        date={dateTo}
        onDateChange={onDateToChange}
        open={openTo}
        onOpenChange={setOpenTo}
        disabled={disabled}
      />
    </div>
  )
}
