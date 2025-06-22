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
import { useEffect, useState } from "react"

export function AssetTable() {
  const [assets, setAssets] = useState([
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
  const [liabilities, setLiabilities] = useState([
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
  const [equity, setEquity] = useState([
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

  useEffect(() => {
    const fetchAssets = async () => {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_currency')
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        return
      }

      const displayCurrency = profileData?.display_currency || 'USD';

      const { data, error } = await supabase
        .from('transaction_legs')
        .select('amount, assets!inner(asset_class, ticker)')

      if (error) {
        console.error('Error fetching assets:', error)
        return
      }

      const assetTotalsByClass = data.reduce((acc, leg) => {
        const asset = Array.isArray(leg.assets) ? leg.assets[0] : leg.assets;
        if (asset) {
          const assetClass = asset.asset_class;
          if (!acc[assetClass]) {
            acc[assetClass] = 0;
          }
          acc[assetClass] += leg.amount;
        }
        return acc;
      }, {} as Record<string, number>);

      const assetTotalsByTicker = data.reduce((acc, leg) => {
        const asset = Array.isArray(leg.assets) ? leg.assets[0] : leg.assets;
        if (asset) {
          const ticker = asset.ticker;
          if (!acc[ticker]) {
            acc[ticker] = 0;
          }
          acc[ticker] += leg.amount;
        }
        return acc;
      }, {} as Record<string, number>);

      const typeToClassMap: { [key: string]: string } = {
        "Cash": "cash",
        "Stocks": "stock",
        "EPF": "epf",
        "Crypto": "crypto",
      };

      const typeToTickerMap: { [key: string]: string } = {
        "Loans Payable": "LOANS_PAYABLE",
        "Paid-in Capital": "CAPITAL",
        "Retained Earnings": "EARNINGS"
      };

      let assetTotal = 0;
      const newAssets = assets.map(asset => {
        const assetClass = typeToClassMap[asset.type];
        const totalAmount = assetTotalsByClass[assetClass] || 0;
        assetTotal += totalAmount;
        return {
          ...asset,
          totalAmount: `${new Intl.NumberFormat().format(totalAmount)} ${displayCurrency}`
        }
      });
      setAssets(newAssets);
      setTotalAssets(`${new Intl.NumberFormat().format(assetTotal)} ${displayCurrency}`);

      const cashTotal = assetTotalsByClass['cash'] || 0;
      const loansPayable = (assetTotalsByTicker['LOANS_PAYABLE'] || 0) * -1;
      const marginsPayable = cashTotal < 0 ? Math.abs(cashTotal) : 0;
      const liabilityTotal = loansPayable + marginsPayable;

      const newLiabilities = liabilities.map(liability => {
        if (liability.type === "Loans Payable") {
          return { ...liability, totalAmount: `${new Intl.NumberFormat().format(loansPayable)} ${displayCurrency}` };
        }
        if (liability.type === "Margins Payable") {
          return { ...liability, totalAmount: `${new Intl.NumberFormat().format(marginsPayable)} ${displayCurrency}` };
        }
        return liability;
      });

      setLiabilities(newLiabilities);
      setTotalLiabilities(`${new Intl.NumberFormat().format(liabilityTotal)} ${displayCurrency}`);

      let equityTotal = 0;
      const newEquity = equity.map(item => {
        const ticker = typeToTickerMap[item.type];
        const totalAmount = (assetTotalsByTicker[ticker] || 0) * -1;
        equityTotal += totalAmount;
        return {
          ...item,
          totalAmount: `${new Intl.NumberFormat().format(totalAmount)} ${displayCurrency}`
        }
      });
      setEquity(newEquity);
      setTotalEquity(`${new Intl.NumberFormat().format(equityTotal)} ${displayCurrency}`);
    }

    fetchAssets();
  }, [])

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
                  <TableHead className="text-left px-4">Owner's Equity</TableHead>
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