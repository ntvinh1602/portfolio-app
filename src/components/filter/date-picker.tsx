"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "../ui/calendar"

type SinglePickerProps = {
  date: Date
  onDateChange: (date: Date) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled: boolean
  label?: string
}

function SingleDatePicker({
  date,
  onDateChange,
  open,
  onOpenChange,
  disabled,
  label,
}: SinglePickerProps) {
  return (
    <div className="flex items-center w-full gap-2">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              id="dates"
              disabled={disabled}
              className="flex-1 justify-between"
            >
              <span>{label || ""}</span>
              {format(date, "dd MMM yyyy")}
            </Button>
          }
        ></PopoverTrigger>
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
    <div className="flex items-center w-full justify-between gap-4">
      <SingleDatePicker
        date={dateFrom}
        onDateChange={onDateFromChange}
        open={openFrom}
        onOpenChange={setOpenFrom}
        disabled={disabled}
        label="From"
      />
      <SingleDatePicker
        date={dateTo}
        onDateChange={onDateToChange}
        open={openTo}
        onOpenChange={setOpenTo}
        disabled={disabled}
        label="To"
      />
    </div>
  )
}
