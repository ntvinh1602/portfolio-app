"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"

type DatePickerProps = (
  | {
      mode: "single"
      selected: Date | undefined
      onSelect: (date: Date | undefined) => void
    }
  | {
      mode: "range"
      selected: DateRange | undefined
      onSelect: (range: DateRange | undefined) => void
    }
)

export default function DatePicker(props: DatePickerProps) {
  const buttonText = React.useMemo(() => {
    if (props.mode === "range") {
      const { selected } = props
      if (selected?.from && selected?.to) {
        return `${format(selected.from, "dd/MM/yy")} - ${format(
          selected.to,
          "dd/MM/yy",
        )}`
      }
      return "Filter by date..."
    }

    if (props.mode === "single") {
      const { selected } = props
      if (selected) {
        return format(selected, "dd/MM/yyyy")
      }
      return "Select a date"
    }
  }, [props])

  return (
    <div className="flex flex-col gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="dates"
            className="w-full justify-between font-normal"
          >
            <CalendarIcon className="size-4" />
            <span className="flex-1 text-left">{buttonText}</span>
            <ChevronDownIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="rounded-2xl bg-card/25 backdrop-blur-sm w-auto overflow-hidden p-0" align="start">
          <Calendar
            captionLayout="dropdown"
            weekStartsOn={1}
            {...props}
          />
          <div className="p-2 text-xs">
            {props.mode === "single" && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => props.onSelect(new Date())}
              >
                Today
              </Button>
            )}
            {props.mode === "range" && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => props.onSelect(undefined)}
              >
                Clear Selection
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
