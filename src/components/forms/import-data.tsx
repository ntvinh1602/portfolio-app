"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { parse as parseCsv } from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

const REQUIRED_HEADERS = [
  "date",
  "type",
  "account",
  "asset_ticker",
  "cash_asset_ticker",
  "quantity",
  "price",
  "fees",
  "taxes",
  "counterparty",
  "interest_rate",
  "principal",
  "interest",
  "description",
];

export function TransactionImportForm({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  const title = "Ready to import data?"
  const description = "Make sure your .csv file is in correct header format"

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <ImportForm className="px-6 pb-40"/>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <ImportForm />
      </DialogContent>
    </Dialog>
  )
}

interface ImportFormProps {
  className?: string;
}

function ImportForm( { className }: ImportFormProps ) {
  const [file, setFile] = React.useState<File | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const router = useRouter()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0])
    }
  }

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

      parseCsv<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
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
              const response = await fetch("/api/database/import", {
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
        error: (error: Error) => {
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
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <Input
        id="csv-file"
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={isUploading}
        className="rounded-full h-10"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={!file || isUploading}>
          {isUploading ? "Importing..." : "Import"}
        </Button>
      </div>
    </form>
  );
}