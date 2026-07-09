"use client"

import { useState } from "react"
import { SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { ButtonGroup } from "../ui/button-group"
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group"

interface FilterSearchProps {
  placeholder: string
  value: string
  onCommit: (value: string) => void
}

export function FilterSearch({
  placeholder,
  value,
  onCommit,
}: FilterSearchProps) {
  const [searchInput, setSearchInput] = useState(value)

  const commitSearch = () => {
    onCommit(searchInput)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch()
  }

  return (
    <Field orientation="horizontal">
      <FieldLabel className="sr-only">{placeholder}</FieldLabel>
      <ButtonGroup className="w-full">
        <InputGroup className="rounded-xl h-10 bg-background">
          <InputGroupInput
            placeholder={placeholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full"
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
        <Button
          variant="outline"
          size="lg"
          onClick={commitSearch}
          aria-label="Search"
        >
          Search
        </Button>
      </ButtonGroup>
    </Field>
  )
}
