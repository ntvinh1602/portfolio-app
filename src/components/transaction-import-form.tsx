"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { parse as parseCsv } from "papaparse";

const REQUIRED_HEADERS = [
  "date",
  "type",
  "account",
  "asset_ticker",
  "cash_asset_ticker",
  "quantity",
  "price",
  "amount",
  "fees",
  "taxes",
  "counterparty",
  "interest_rate",
  "principal_payment",
  "interest_payment",
  "description",
];

export function TransactionImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      if (!csvText) {
        toast.error("Could not read the file.");
        setIsUploading(false);
        return;
      }

      parseCsv(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          (async () => {
            const headers = results.meta.fields;
            const missingHeaders = REQUIRED_HEADERS.filter(
              (h) => !headers?.includes(h)
            );

            if (missingHeaders.length > 0) {
              toast.error(
                `CSV file is missing required headers: ${missingHeaders.join(
                  ", "
                )}`
              );
              setIsUploading(false);
              return;
            }

            const formData = new FormData();
            formData.append("file", file);

            try {
              const response = await fetch("/api/transactions/import", {
                method: "POST",
                body: formData,
              });
              const result = await response.json();
              if (response.ok) {
                toast.success("File imported successfully!");
                router.push("/transactions");
              } else {
                toast.error(result.error || "An unknown error occurred.");
              }
            } catch (error) {
              toast.error("Failed to upload file. Please try again.");
              console.error("Import error:", error);
            } finally {
              setIsUploading(false);
            }
          })();
        },
        error: (error: any) => {
          toast.error("Failed to parse CSV file.");
          console.error("CSV parsing error:", error);
          setIsUploading(false);
        },
      });
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Instructions</h3>
        <p className="text-sm text-muted-foreground">
          Please prepare your CSV file with the following columns. The order
          must be exact. Not all columns are required for every transaction
          type, but the header must be present.
        </p>
        <code className="block whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
          {REQUIRED_HEADERS.join(",")}
        </code>
        <a
          href="/templates/transactions_template.csv"
          className="text-sm font-medium text-primary hover:underline"
          download
        >
          Download Template CSV
        </a>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="csv-file">CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
        <Button type="submit" disabled={!file || isUploading}>
          {isUploading ? "Uploading..." : "Upload and Import"}
        </Button>
      </form>
    </div>
  );
}