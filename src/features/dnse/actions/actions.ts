"use server"

import { getDnseDashboardData } from "@/features/dnse/api"
import type { DnseDashboardData } from "@/features/dnse/types"

export async function fetchDnseDashboard(
  accountNo?: string
): Promise<DnseDashboardData> {
  return getDnseDashboardData(accountNo)
}
