"use client"

import { DnseAccountOverview } from "@/features/dnse/components/account-overview"
import { fetchDnseDashboard } from "@/features/dnse/actions/actions"
import { DnseAccountSelector } from "@/features/dnse/components/account-selector"
import { DnseApiError, DnseConfigError } from "@/features/dnse/client"
import { DnseErrorState } from "@/features/dnse/components/error-state"
import {
  buildAccountOptions,
  buildHoldingItems,
  buildOverviewModel,
} from "@/features/dnse/format"
import { DnseHoldingsList } from "@/features/dnse/components/holdings-list"
import type { DnseDashboardData } from "@/features/dnse/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

type DnseLoadError = {
  title: string
  description: string
}

export default function Page() {
  return (
    <Suspense fallback={<DnseDashboardFallback />}>
      <DnseDashboardContent />
    </Suspense>
  )
}

function DnseDashboardContent() {
  const searchParams = useSearchParams()
  const accountNo = searchParams.get("accountNo") ?? undefined

  const [dashboard, setDashboard] = useState<DnseDashboardData | null>(null)
  const [error, setError] = useState<DnseLoadError | null>(null)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchDnseDashboard(accountNo)
      .then((data) => {
        if (cancelled) return
        setDashboard(data)
        setError(null)
        setFetched(true)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setDashboard(null)
        setError(getErrorCopy(err))
        setFetched(true)
      })

    return () => {
      cancelled = true
    }
  }, [accountNo])

  if (!fetched) {
    return <DnseDashboardFallback />
  }

  if (error) {
    return (
      <DnseErrorState title={error.title} description={error.description} />
    )
  }

  if (!dashboard) {
    return (
      <DnseErrorState
        title="Unexpected DNSE error"
        description="No data was returned from the dashboard."
      />
    )
  }

  if (!dashboard.selectedAccount) {
    return (
      <DnseErrorState
        title="No DNSE accounts found"
        description="The API key did not return any brokerage sub-accounts to display."
      />
    )
  }

  const accountOptions = buildAccountOptions(dashboard.availableAccounts)
  const overview = buildOverviewModel(
    dashboard.accounts,
    dashboard.selectedAccount,
    dashboard.balances,
    dashboard.positions,
  )
  const holdings = buildHoldingItems(dashboard.positions)

  return (
    <div className="@container/main flex flex-1 flex-col pb-4">
      <div className="flex flex-col gap-6 w-full xl:max-w-320 mx-auto">
        <DnseAccountSelector
          accounts={accountOptions}
          selectedAccountNo={dashboard.selectedAccount.id}
        />
        <DnseAccountOverview overview={overview} />
        <DnseHoldingsList holdings={holdings} />
      </div>
    </div>
  )
}

function DnseDashboardFallback() {
  return (
    <>
      <div className="flex justify-end">
        <Skeleton className="h-16 w-full max-w-72 rounded-3xl" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
        <Skeleton className="h-72 rounded-4xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-4xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-96 rounded-4xl" />
    </>
  )
}

function getErrorCopy(error: unknown) {
  if (error instanceof DnseConfigError) {
    return {
      title: "DNSE credentials are missing",
      description: error.message,
    }
  }

  if (error instanceof DnseApiError) {
    const description =
      error.code === "NETWORK_ERROR"
        ? `${error.message}. The DNSE API may be unreachable from outside Vietnam.`
        : error.code !== undefined
          ? `${error.message} (${error.code})`
          : error.message
    return {
      title: "Unable to load DNSE data",
      description,
    }
  }

  return {
    title: "Unexpected DNSE error",
    description: "An unexpected error occurred while loading the dashboard.",
  }
}
