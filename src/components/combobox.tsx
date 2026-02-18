"use client"

import { useState } from "react"
import { CheckIcon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor
} from "@/components/ui/popover"

export type ComboboxItem = {
  value: string
  label: string
}

type ComboboxProps = {
  items: ComboboxItem[]
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyPlaceholder?: string
  className?: string
}

export function Combobox({
  items,
  value,
  onChange,
  placeholder = "Select an item...",
  searchPlaceholder = "Search...",
  emptyPlaceholder = "No item found.",
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)

  const selectedItem = items.find(item => item.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-transparent", className)}
        >
          {selectedItem
            ? <span>{selectedItem.label}</span>
            : <span className="text-muted-foreground">{placeholder}</span>
          }
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="min-w-[var(--radix-popover-trigger-width)] w-[var(--radix-popover-trigger-width)] p-0"
        onTouchMove={(e) => {
          e.stopPropagation();
        }}
        onWheel={(e) => {
          e.stopPropagation(); 
        }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-52">
            <CommandEmpty>{emptyPlaceholder}</CommandEmpty>
            <CommandGroup>
              {items.map(item => (
                <CommandItem
                  className="p-3"
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onChange(item.value === value ? undefined : item.value)
                    setOpen(false)
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}