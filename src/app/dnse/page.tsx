import { DnseAccountOverview } from "@/lib/dnse/account-overview"
import { getDnseDashboardData } from "@/lib/dnse/api"
import { DnseAccountSelector } from "@/lib/dnse/account-selector"
import { DnseApiError, DnseConfigError } from "@/lib/dnse/client"
import { DnseErrorState } from "@/lib/dnse/error-state"
import {
  buildAccountOptions,
  buildHoldingItems,
  buildOverviewModel,
} from "@/lib/dnse/format"
import { DnseHoldingsList } from "@/lib/dnse/holdings-list"
import type { DnseDashboardData } from "@/lib/dnse/types"
import { Skeleton } from "@/components/ui/skeleton"
import { connection } from "next/server"
import { Suspense, type ReactNode } from "react"

interface PageProps {
  searchParams?: Promise<{
    accountNo?: string | string[]
  }>
}

type DnseLoadError = {
  title: string
  description: string
}

type LoadDnseDashboardResult =
  | { dashboard: DnseDashboardData }
  | { error: DnseLoadError }

export default function Page({ searchParams }: PageProps) {
  return (
    <PageShell>
      <Suspense fallback={<DnseDashboardFallback />}>
        <DnseDashboardContent searchParams={searchParams} />
      </Suspense>
    </PageShell>
  )
}

async function DnseDashboardContent({ searchParams }: PageProps) {
  await connection()
  const params = (await searchParams) ?? {}
  const result = await loadDnseDashboardContent(params.accountNo)

  if (!("dashboard" in result)) {
    return (
      <DnseErrorState
        title={result.error.title}
        description={result.error.description}
      />
    )
  }

  if (!result.dashboard.selectedAccount) {
    return (
      <DnseErrorState
        title="No DNSE accounts found"
        description="The API key did not return any brokerage sub-accounts to display."
      />
    )
  }

  const accountOptions = buildAccountOptions(result.dashboard.availableAccounts)
  const overview = buildOverviewModel(
    result.dashboard.accounts,
    result.dashboard.selectedAccount,
    result.dashboard.balances,
    result.dashboard.positions
  )
  const holdings = buildHoldingItems(result.dashboard.positions)

  return (
    <>
      <div className="flex justify-end">
        <DnseAccountSelector
          accounts={accountOptions}
          selectedAccountNo={result.dashboard.selectedAccount.id}
        />
      </div>
      <DnseAccountOverview overview={overview} />
      <DnseHoldingsList holdings={holdings} />
    </>
  )
}

function PageShell({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="@container/main flex flex-1 flex-col pb-4">
      <div className="flex flex-col gap-6 px-2 md:px-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Brokerage
          </p>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              DNSE Dashboard
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Read-only brokerage identity, cash balances, and current stock
              holdings powered by the DNSE OpenAPI.
            </p>
          </div>
        </div>

        {children}
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
    return {
      title: "Unable to load DNSE data",
      description:
        error.code !== undefined
          ? `${error.message} (${error.code})`
          : error.message,
    }
  }

  return {
    title: "Unexpected DNSE error",
    description: "An unexpected error occurred while loading the dashboard.",
  }
}

async function loadDnseDashboardContent(
  requestedAccountNo?: string | string[]
): Promise<LoadDnseDashboardResult> {
  try {
    const dashboard = await getDnseDashboardData(requestedAccountNo)
    return { dashboard }
  } catch (error) {
    return { error: getErrorCopy(error) }
  }
}
