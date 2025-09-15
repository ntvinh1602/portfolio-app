"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { parse as parseCsv } from "papaparse"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

const REQUIRED_HEADERS = [
  "date",
  "type",
  "asset_ticker",
  "cash_asset_ticker",
  "quantity",
  "price",
  "counterparty",
  "interest_rate",
  "principal",
  "interest",
  "description",
]

export function ImportForm() {
  const [file, setFile] = React.useState<File | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const router = useRouter()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0])
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()


    if (!file) {
      toast.error("Please select a file to upload.")
      return
    }
    setIsUploading(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      const csvText = e.target?.result as string
      if (!csvText) {
        toast.error("Could not read the file.")
        setIsUploading(false)
        return
      }

      parseCsv<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          (async () => {
            const headers = results.meta.fields
            const missingHeaders = REQUIRED_HEADERS.filter(
              (h) => !headers?.includes(h)
            )

            if (missingHeaders.length > 0) {
              toast.error(
                `CSV file is missing required headers: ${missingHeaders.join(
                  ", "
                )}`
              )
              setIsUploading(false)
              return
            }

            const formData = new FormData()
            formData.append("file", file)

            try {
              const response = await fetch("/api/database/import", {
                method: "POST",
                body: formData,
              })
              const result = await response.json()
              if (response.ok) {
                toast.success("File imported successfully!")
                router.push("/transactions")
              } else {
                toast.error(result.error || "An unknown error occurred.")
              }
            } catch (error) {
              toast.error("Failed to upload file. Please try again.")
              console.error("Import error:", error)
            } finally {
              setIsUploading(false)
            }
          })()
        },
        error: (error: Error) => {
          toast.error("Failed to parse CSV file.")
          console.error("CSV parsing error:", error)
          setIsUploading(false)
        },
      })
    }
    reader.onerror = () => {
      toast.error("Failed to read file.")
      setIsUploading(false)
    }
    reader.readAsText(file)
  }

  return (
    <Card className="col-start-2 h-fit">
      <CardHeader>
        <CardTitle>Import Data</CardTitle>
        <CardDescription>
          Upload transaction data for bulk processing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isUploading}
            className="h-10"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!file || isUploading}>
              {isUploading ? "Importing..." : "Import"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}