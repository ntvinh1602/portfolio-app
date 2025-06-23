import { TransactionImportForm } from "@/components/transaction-import-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TransactionImportPage() {
  return (
    <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      <div className="mx-auto grid w-full max-w-6xl gap-2">
        <h1 className="text-3xl font-semibold">Import Transactions</h1>
        <Card>
          <CardHeader>
            <CardTitle>CSV Import</CardTitle>
            <CardDescription>
              Upload a CSV file to import your historical transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionImportForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}