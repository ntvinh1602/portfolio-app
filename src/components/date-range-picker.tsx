"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Calendar23Props {
  selected: DateRange | undefined
  onSelect: (range: DateRange | undefined) => void
}

export default function DateRangePicker({ selected, onSelect }: Calendar23Props) {
  return (
    <div className="flex flex-col gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="dates"
            className="w-56 h-8 justify-between font-normal"
          >
            {selected?.from && selected?.to
              ? `${selected.from.toLocaleDateString()} - ${selected.to.toLocaleDateString()}`
              : "Select date"}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="range"
            selected={selected}
            captionLayout="dropdown"
            onSelect={onSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
