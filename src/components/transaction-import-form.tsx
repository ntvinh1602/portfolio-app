"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { parse as parseCsv } from "papaparse";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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

const column = [
  {
    column: "date",
    description: "Transaction date in YYYY-MM-DD format. Required.",
  },
  {
    column: "type",
    description: "Transaction type. Required. Possible values: 'buy', 'sell', 'deposit', 'withdraw', 'expense', 'income', 'dividend', 'debt_payment', 'split', 'borrow",
  },
  {
    column: "asset_ticker",
    description: "Ticker symbol of the asset involved in the transaction. Required for buy, sell, dividend, split transactions.",
  },
  {
    column: "cash_asset_ticker",
    description: "Ticker symbol of the cash asset involved in the transaction. Required.",
  },
  {
    column: "quantity",
    description: "Quantity of the asset involved in the transaction. Required for buy, sell, split transactions.",
  },
  {
    column: "price",
    description: "Matched price. Required for buy, sell transactions.",
  },
  {
    column: "amount",
    description: "Amount of cash involved in the transaction. Required for all transactions except split, debt_payment.",
  },
  {
    column: "fees",
    description: "Fees associated with the transaction. Required for buy, sell.",
  },
  {
    column: "taxes",
    description: "Taxes associated with the transaction. Required for sell.",
  },
  {
    column: "counterparty",
    description: "Lender name. Required for borrow transactions.",
  },
  {
    column: "interest_rate",
    description: "Interest rate for the debt. Required for borrow transactions.",
  },
  {
    column: "principal_payment",
    description: "Principal amount paid towards the debt. Required for debt_payment transactions.",
  },
  {
    column: "interest_payment",
    description: "Interest amount paid towards the debt. Required for debt_payment transactions.",
  },
  {
    column: "description",
    description: "Description of the transaction. Optional but recommended for clarity.",
  },
]

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
    <Card>
      <CardHeader>
        <CardTitle>Import Transaction Data</CardTitle>
        <CardDescription>
          Upload your transaction data in .csv format.
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
          />
          <Button type="submit" disabled={!file || isUploading}>
            {isUploading ? "Uploading..." : "Upload and Import"}
          </Button>
        </form>
      </CardContent>
      <CardContent>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>What is this for?</AccordionTrigger>
            <AccordionContent>
              You can import transactions in bulk instead of adding one by one manually.
              <br /><br />
              This is useful for initializing database for new users with historical data or correcting any missing data after a long inactivity period.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is there any format requirement for the data?</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2">
              Yes, please prepare your .csv file with the following columns. The order must be exact. Not all columns are required for every transaction type, but the header must be present.
              <code className="block whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
                {REQUIRED_HEADERS.join("\n")}
              </code>
              <a
                href="/templates/transactions_template.csv"
                className="text-sm font-medium text-primary hover:underline"
                download
              >
                Download Template .csv
              </a>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>What do those column headers mean?</AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader className="bg-accent">
                  <TableRow>
                    <TableHead className="px-2">Column</TableHead>
                    <TableHead className="px-2">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {column.map((column) => (
                    <TableRow key={column.column}>
                      <TableCell className="px-2">{column.column}</TableCell>
                      <TableCell className="px-2">{column.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}