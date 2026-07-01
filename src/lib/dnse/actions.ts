"use server"

import { getDnseDashboardData } from "@/lib/dnse/api"
import type { DnseDashboardData } from "@/lib/dnse/types"

export async function fetchDnseDashboard(
  accountNo?: string
): Promise<DnseDashboardData> {
  return getDnseDashboardData(accountNo)
}
