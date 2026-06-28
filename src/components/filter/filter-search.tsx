"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"

interface FilterSearchProps {
  icon: LucideIcon
  placeholder: string
  value: string
  onCommit: (value: string) => void
}

function FilterSearchInput({
  placeholder,
  value,
  onCommit,
}: {
  placeholder: string
  value: string
  onCommit: (value: string) => void
}) {
  const [searchInput, setSearchInput] = useState(value)

  const commitSearch = () => {
    onCommit(searchInput)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch()
  }

  return (
    <>
      <Input
        placeholder={placeholder}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full"
      />
      <Button size="icon" onClick={commitSearch} aria-label="Search">
        <Search className="size-4" />
      </Button>
    </>
  )
}

export function FilterSearch({
  icon: Icon,
  placeholder,
  value,
  onCommit,
}: FilterSearchProps) {
  return (
    <Field orientation="horizontal">
      <FieldLabel>
        <Icon className="stroke-1 size-5" />
      </FieldLabel>
      <FilterSearchInput
        key={value}
        placeholder={placeholder}
        value={value}
        onCommit={onCommit}
      />
    </Field>
  )
}
