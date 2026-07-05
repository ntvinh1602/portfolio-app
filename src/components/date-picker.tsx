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

type SinglePickerProps = {
  date: Date
  onDateChange: (date: Date) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled: boolean
}

function SingleDatePicker({
  date,
  onDateChange,
  open,
  onOpenChange,
  disabled,
}: SinglePickerProps) {
  return (
    <div className="flex items-center w-full gap-2">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            size="lg"
            id="dates"
            disabled={disabled}
            className="flex-1"
          >
            {format(date, "dd MMM yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
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
    </div>
  )
}

type DatePickerProps = {
  dateFrom: Date
  dateTo: Date
  onDateFromChange: (date: Date) => void
  onDateToChange: (date: Date) => void
  disabled?: boolean
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  disabled = false,
}: DatePickerProps) {
  const [openFrom, setOpenFrom] = useState(false)
  const [openTo, setOpenTo] = useState(false)

  return (
    <div className="flex items-center w-full justify-between gap-2">
      <span className={cn(disabled && "opacity-50 pointer-events-none")}>
        From
      </span>
      <SingleDatePicker
        date={dateFrom}
        onDateChange={onDateFromChange}
        open={openFrom}
        onOpenChange={setOpenFrom}
        disabled={disabled}
      />
      <span className={cn(disabled && "opacity-50 pointer-events-none")}>
        To
      </span>
      <SingleDatePicker
        date={dateTo}
        onDateChange={onDateToChange}
        open={openTo}
        onOpenChange={setOpenTo}
        disabled={disabled}
      />
    </div>
  )
}
