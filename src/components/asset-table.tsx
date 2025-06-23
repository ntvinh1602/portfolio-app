"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useEffect, useState, useCallback } from "react"

interface SummaryItem {
  type: string;
  totalAmount: number;
}

interface AssetSummaryData {
  displayCurrency: string;
  assets: SummaryItem[];
  totalAssets: number;
  liabilities: SummaryItem[];
  totalLiabilities: number;
  equity: SummaryItem[];
  totalEquity: number;
}

interface DisplayItem {
  type: string;
  totalAmount: string;
}

export function AssetTable() {
  const [assets, setAssets] = useState<DisplayItem[]>([
    {
      type: "Cash",
      totalAmount: "0",
    },
    {
      type: "Stocks",
      totalAmount: "0",
    },
    {
      type: "EPF",
      totalAmount: "0",
    },
    {
      type: "Crypto",
      totalAmount: "0",
    },
  ]);
  const [totalAssets, setTotalAssets] = useState("$0.00");
  const [liabilities, setLiabilities] = useState<DisplayItem[]>([
    {
      type: "Loans Payable",
      totalAmount: "0",
    },
    {
      type: "Margins Payable",
      totalAmount: "0",
    },
  ]);
  const [totalLiabilities, setTotalLiabilities] = useState("$0.00");
  const [equity, setEquity] = useState<DisplayItem[]>([
    {
      type: "Paid-in Capital",
      totalAmount: "0",
    },
    {
      type: "Retained Earnings",
      totalAmount: "0",
    },
  ]);
  const [totalEquity, setTotalEquity] = useState("$0.00");

  const fetchAssets = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_asset_summary');

    if (error) {
      console.error('Error fetching asset summary:', error);
      return;
    }

    if (data) {
      const {
        displayCurrency,
        assets,
        totalAssets,
        liabilities,
        totalLiabilities,
        equity,
        totalEquity
      } = data as AssetSummaryData;

      const formatCurrency = (amount: number) => {
        return `${new Intl.NumberFormat().format(amount)} ${displayCurrency}`;
      };

      setAssets(assets.map((asset) => ({
        ...asset,
        totalAmount: formatCurrency(asset.totalAmount)
      })));
      setTotalAssets(formatCurrency(totalAssets));

      setLiabilities(liabilities.map((liability) => ({
        ...liability,
        totalAmount: formatCurrency(liability.totalAmount)
      })));
      setTotalLiabilities(formatCurrency(totalLiabilities));

      setEquity(equity.map((item) => ({
        ...item,
        totalAmount: formatCurrency(item.totalAmount)
      })));
      setTotalEquity(formatCurrency(totalEquity));
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets])

  return (
    <Card className="flex flex-col shadow-none">
      <h1 className="text-xl font-bold px-6">
        Assets Summary
      </h1>
      <div className="flex flex-col gap-4 w-full">
        <CardHeader>
          <CardTitle>Total Assets</CardTitle>
          <CardDescription>
            Assets by investment type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-accent">
              <TableRow>
                <TableHead className="text-left px-4">Assets</TableHead>
                <TableHead className="text-right px-4">{totalAssets}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow className="border-hidden" key={asset.type}>
                  <TableCell className="font-normal px-4">{asset.type}</TableCell>
                  <TableCell className="text-right px-4">{asset.totalAmount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </div>
      <div className="flex items-center justify-between px-6">
        <Separator className="w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <CardHeader>
          <CardTitle>Total Liabilities</CardTitle>
          <CardDescription>
            Assets by funding type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Table>
              <TableHeader className="bg-accent"> 
                <TableRow>
                  <TableHead className="text-left px-4">Liabilities</TableHead>
                  <TableHead className="text-right px-4">{totalLiabilities}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liabilities.map((liability) => (
                  <TableRow className="border-hidden" key={liability.type}>
                    <TableCell className="font-normal px-4">{liability.type}</TableCell>
                    <TableCell className="text-right px-4">{liability.totalAmount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Table>
              <TableHeader className="bg-accent">
                <TableRow>
                  <TableHead className="text-left px-4">Owner&apos;s Equity</TableHead>
                  <TableHead className="text-right px-4">{totalEquity}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equity.map((item) => (
                  <TableRow className="border-hidden" key={item.type}>
                    <TableCell className="font-normal px-4">{item.type}</TableCell>
                    <TableCell className="text-right px-4">{item.totalAmount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}